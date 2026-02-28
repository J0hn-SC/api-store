import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from './products.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { S3Service } from 'src/s3/s3.service';
import { PaymentsService } from 'src/payments/payments.service';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { EntityStatus } from './dtos/inputs/entity-status.input';
import { Role, PrismaClient } from '@prisma/client';
import { BadRequestException, ConflictException, InternalServerErrorException } from '@nestjs/common';

describe('ProductsService', () => {
  let service: ProductsService;
  let prisma: DeepMockProxy<PrismaClient>;
  let s3Service: S3Service;
  let paymentsService: PaymentsService;

  const mockS3Service = {
    uploadFile: jest.fn(),
    deleteFile: jest.fn(),
  };

  const mockPaymentsService = {
    createSellableProduct: jest.fn(),
    updateSellableProduct: jest.fn(),
    disabledSellableProduct: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: PrismaService, useValue: mockDeep<PrismaClient>() },
        { provide: S3Service, useValue: mockS3Service },
        { provide: PaymentsService, useValue: mockPaymentsService },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    prisma = module.get(PrismaService) as unknown as DeepMockProxy<PrismaClient>;
    s3Service = module.get<S3Service>(S3Service);
    paymentsService = module.get<PaymentsService>(PaymentsService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createInput = {
      name: 'Test Product',
      description: 'Test Description',
      price: 10.5,
      stock: 100,
      categoryId: 'cat-123',
      status: EntityStatus.ACTIVE,
    };

    const mockStripeData = {
      productId: 'prod_123',
      priceId: 'price_123',
    };

    it('should successfully create a product and register it in payments service', async () => {
      // 1. Arrange
      mockPaymentsService.createSellableProduct.mockResolvedValue(mockStripeData);
      prisma.product.create.mockResolvedValue({ id: 'prod-uuid', ...createInput } as any);

      // 2. Act
      const result = await service.create(createInput);

      // 3. Assert
      expect(paymentsService.createSellableProduct).toHaveBeenCalledWith({
        name: createInput.name,
        description: createInput.description,
        price: 1050, // 10.5 * 100
        currency: 'usd',
      });

      expect(prisma.product.create).toHaveBeenCalledWith({
        data: {
          ...createInput,
          stripeProductId: mockStripeData.productId,
          stripePriceId: mockStripeData.priceId,
        },
      });

      expect(result).toHaveProperty('id', 'prod-uuid');
    });

    it('should throw if payments service fails', async () => {
      // Arrange
      mockPaymentsService.createSellableProduct.mockRejectedValue(new Error('Stripe error'));

      // Act & Assert
      await expect(service.create(createInput)).rejects.toThrow('Stripe error');
      expect(prisma.product.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    const productId = 'prod-uuid';
    const existingProduct = {
      id: productId,
      name: 'Old Name',
      description: 'Old Desc',
      price: 10.0,
      stripeProductId: 'stripe-prod-123',
      stripePriceId: 'stripe-price-123',
    };

    it('should update product without calling payments service if name and price remain the same', async () => {
      // Arrange
      const updateInput = { id: 'prod-uuid', description: 'New Description' };
      prisma.product.findUnique.mockResolvedValue(existingProduct as any);
      prisma.product.update.mockResolvedValue({ ...existingProduct, ...updateInput } as any);

      // Act
      const result = await service.update(productId, updateInput);

      // Assert
      expect(paymentsService.updateSellableProduct).not.toHaveBeenCalled();
      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: productId },
        data: {
          id: productId,
          description: 'New Description',
        },
      });
      expect(result.description).toBe('New Description');
    });

    it('should update product and call payments service if name is changed', async () => {
      // Arrange
      const updateInput = { id: 'prod-uuid', name: 'New Name' };
      const mockStripeData = { productId: 'stripe-prod-123', priceId: 'new-price-id' };

      prisma.product.findUnique.mockResolvedValue(existingProduct as any);
      mockPaymentsService.updateSellableProduct.mockResolvedValue(mockStripeData);
      prisma.product.update.mockResolvedValue({ ...existingProduct, ...updateInput, stripePriceId: 'new-price-id' } as any);

      // Act
      await service.update(productId, updateInput);

      // Assert
      expect(paymentsService.updateSellableProduct).toHaveBeenCalledWith({
        productId: existingProduct.stripeProductId,
        name: 'New Name',
        description: existingProduct.description,
        price: 1000,
        currency: 'usd',
      });

      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: productId },
        data: expect.objectContaining({
          name: 'New Name',
          stripePriceId: 'new-price-id',
        }),
      });
    });

    it('should update product and call payments service if price is changed', async () => {
      // Arrange
      const updateInput = { id: 'prod-uuid', price: 15.0 };
      const mockStripeData = { productId: 'stripe-prod-123', priceId: 'new-price-id' };

      prisma.product.findUnique.mockResolvedValue(existingProduct as any);
      mockPaymentsService.updateSellableProduct.mockResolvedValue(mockStripeData);
      prisma.product.update.mockResolvedValue({ ...existingProduct, ...updateInput, stripePriceId: 'new-price-id' } as any);

      // Act
      await service.update(productId, updateInput);

      // Assert
      expect(paymentsService.updateSellableProduct).toHaveBeenCalledWith({
        productId: existingProduct.stripeProductId,
        name: existingProduct.name,
        description: existingProduct.description,
        price: 1500,
        currency: 'usd',
      });
    });

    it('should throw ConflictException if product is not found', async () => {
      // Arrange
      prisma.product.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.update(productId, { id: 'prod-uuid', name: 'New Name' })).rejects.toThrow(ConflictException);
      expect(paymentsService.updateSellableProduct).not.toHaveBeenCalled();
    });

    it('should throw if payments service fails during name/price update', async () => {
      // Arrange
      prisma.product.findUnique.mockResolvedValue(existingProduct as any);
      mockPaymentsService.updateSellableProduct.mockRejectedValue(new Error('Stripe Update error'));

      // Act & Assert
      await expect(service.update(productId, { id: 'prod-uuid', name: 'New Name' })).rejects.toThrow('Stripe Update error');
      expect(prisma.product.update).not.toHaveBeenCalled();
    });
  });

  describe('disable', () => {
    const productId = 'prod-uuid';
    const mockProduct = {
      id: productId,
      stripeProductId: 'stripe-prod-123',
      stripePriceId: 'stripe-price-123',
      status: EntityStatus.ACTIVE,
    };

    it('should successfully disable a product', async () => {
      // 1. Arrange
      prisma.product.findUnique.mockResolvedValue(mockProduct as any);
      mockPaymentsService.disabledSellableProduct.mockResolvedValue({ productId: 'stripe-prod-123', priceId: 'stripe-price-123' });
      prisma.product.update.mockResolvedValue({ ...mockProduct, status: EntityStatus.DISABLED } as any);

      // 2. Act
      const result = await service.disable(productId);

      // 3. Assert
      expect(prisma.product.findUnique).toHaveBeenCalledWith({ where: { id: productId } });
      expect(paymentsService.disabledSellableProduct).toHaveBeenCalledWith({
        productId: mockProduct.stripeProductId,
        priceId: mockProduct.stripePriceId,
      });
      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: productId },
        data: { status: EntityStatus.DISABLED },
      });
      expect(result.status).toBe(EntityStatus.DISABLED);
    });

    it('should throw ConflictException if product to disable is not found', async () => {
      // Arrange
      prisma.product.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.disable(productId)).rejects.toThrow(ConflictException);
      expect(paymentsService.disabledSellableProduct).not.toHaveBeenCalled();
    });

    it('should throw if payments service fails during disable', async () => {
      // Arrange
      prisma.product.findUnique.mockResolvedValue(mockProduct as any);
      mockPaymentsService.disabledSellableProduct.mockRejectedValue(new Error('Stripe Disable error'));

      // Act & Assert
      await expect(service.disable(productId)).rejects.toThrow('Stripe Disable error');
      expect(prisma.product.update).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    const productId = 'prod-uuid';
    const mockProduct = {
      id: productId,
      stripeProductId: 'stripe-prod-123',
      stripePriceId: 'stripe-price-123',
    };

    it('should successfully soft-delete a product', async () => {
      // 1. Arrange
      prisma.product.findUnique.mockResolvedValue(mockProduct as any);
      mockPaymentsService.disabledSellableProduct.mockResolvedValue({ productId: 'stripe-prod-123', priceId: 'stripe-price-123' });
      prisma.product.update.mockResolvedValue({ ...mockProduct, deletedAt: new Date() } as any);

      // 2. Act
      const result = await service.delete(productId);

      // 3. Assert
      expect(prisma.product.findUnique).toHaveBeenCalledWith({ where: { id: productId } });
      expect(paymentsService.disabledSellableProduct).toHaveBeenCalledWith({
        productId: mockProduct.stripeProductId,
        priceId: mockProduct.stripePriceId,
      });
      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: productId },
        data: { deletedAt: expect.any(String) }, // In the service it uses Date() which returns a string if called without new
      });
      expect(result).toHaveProperty('deletedAt');
    });

    it('should throw ConflictException if product to delete is not found', async () => {
      // Arrange
      prisma.product.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.delete(productId)).rejects.toThrow(ConflictException);
      expect(paymentsService.disabledSellableProduct).not.toHaveBeenCalled();
    });

    it('should throw if payments service fails during delete', async () => {
      // Arrange
      prisma.product.findUnique.mockResolvedValue(mockProduct as any);
      mockPaymentsService.disabledSellableProduct.mockRejectedValue(new Error('Stripe Delete error'));

      // Act & Assert
      await expect(service.delete(productId)).rejects.toThrow('Stripe Delete error');
      expect(prisma.product.update).not.toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should return a product if found', async () => {
      const product = { id: 'uuid-123', name: 'Test' };
      prisma.product.findUnique.mockResolvedValue(product as any);

      const result = await service.findById('uuid-123');

      expect(result).toEqual(product);
      expect(prisma.product.findUnique).toHaveBeenCalledWith({ where: { id: 'uuid-123' } });
    });

    it('should return null if product not found', async () => {
      prisma.product.findUnique.mockResolvedValue(null);

      const result = await service.findById('uuid-not-found');

      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    const mockProducts = [{ id: '1', name: 'P1' }, { id: '2', name: 'P2' }];
    const pagination = { limit: 10, offset: 0 };

    it('should return all products for MANAGER role', async () => {
      prisma.product.findMany.mockResolvedValue(mockProducts as any);

      const result = await service.findAll({}, pagination, Role.MANAGER);

      expect(result).toEqual(mockProducts);
      expect(prisma.product.findMany).toHaveBeenCalledWith({
        where: {},
        take: 10,
        skip: 0,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should filter by ACTIVE status for CLIENT role', async () => {
      prisma.product.findMany.mockResolvedValue(mockProducts as any);

      await service.findAll({}, pagination, Role.CLIENT);

      expect(prisma.product.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { status: EntityStatus.ACTIVE },
      }));
    });

    it('should apply filters (search, category, price range)', async () => {
      const filters = {
        search: 'test',
        categoryId: 'cat-1',
        minPrice: 10,
        maxPrice: 50,
      };
      prisma.product.findMany.mockResolvedValue([]);

      await service.findAll(filters, pagination, Role.MANAGER);

      expect(prisma.product.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: {
          name: { contains: 'test', mode: 'insensitive' },
          categoryId: 'cat-1',
          price: { gte: 10, lte: 50 },
        },
      }));
    });

    it('should handle pagination correctly', async () => {
      prisma.product.findMany.mockResolvedValue([]);
      const customPagination = { limit: 5, offset: 15 };

      await service.findAll({}, customPagination, Role.MANAGER);

      expect(prisma.product.findMany).toHaveBeenCalledWith(expect.objectContaining({
        take: 5,
        skip: 15,
      }));
    });
  });

  describe('attachImage', () => {
    const productId = 'prod-123';
    const mockFile: any = Promise.resolve({
      filename: 'test.png',
      mimetype: 'image/png',
      createReadStream: jest.fn().mockReturnValue({}),
    });

    it('should successfully attach an image', async () => {
      // Arrange
      const mockUrl = 'https://s3.bucket/products/test.png';
      mockS3Service.uploadFile.mockResolvedValue(mockUrl);
      prisma.productImage.create.mockResolvedValue({ id: 'img-1', url: mockUrl, productId } as any);

      // Act
      const result = await service.attachImage(productId, mockFile);

      // Assert
      expect(mockS3Service.uploadFile).toHaveBeenCalled();
      expect(prisma.productImage.create).toHaveBeenCalledWith({
        data: {
          url: mockUrl,
          productId: productId,
        },
      });
      expect(result.url).toBe(mockUrl);
    });

    it('should throw ConflictException for invalid mimetype', async () => {
      // Arrange
      const invalidFile: any = Promise.resolve({
        filename: 'test.pdf',
        mimetype: 'application/pdf',
        createReadStream: jest.fn(),
      });

      // Act & Assert
      await expect(service.attachImage(productId, invalidFile)).rejects.toThrow(ConflictException);
      expect(mockS3Service.uploadFile).not.toHaveBeenCalled();
    });

    it('should cleanup S3 and throw BadRequestException if product does not exist (P2003)', async () => {
      // Arrange
      const mockUrl = 'https://s3.bucket/products/test.png';
      mockS3Service.uploadFile.mockResolvedValue(mockUrl);
      const prismaError = new Error('Foreign key constraint failed');
      (prismaError as any).code = 'P2003';
      prisma.productImage.create.mockRejectedValue(prismaError);

      // Act & Assert
      await expect(service.attachImage(productId, mockFile)).rejects.toThrow(BadRequestException);
      expect(mockS3Service.deleteFile).toHaveBeenCalledWith(mockUrl);
    });

    it('should cleanup S3 and throw InternalServerErrorException for generic Prisma errors', async () => {
      // Arrange
      const mockUrl = 'https://s3.bucket/products/test.png';
      mockS3Service.uploadFile.mockResolvedValue(mockUrl);
      prisma.productImage.create.mockRejectedValue(new Error('Generic Error'));

      // Act & Assert
      await expect(service.attachImage(productId, mockFile)).rejects.toThrow(InternalServerErrorException);
      expect(mockS3Service.deleteFile).toHaveBeenCalledWith(mockUrl);
    });
  });

  describe('getProductImages', () => {
    it('should return images for a product', async () => {
      const productId = 'prod-123';
      const mockImages = [{ id: '1', url: 'url1' }, { id: '2', url: 'url2' }];
      prisma.productImage.findMany.mockResolvedValue(mockImages as any);

      const result = await service.getProductImages(productId);

      expect(result).toEqual(mockImages);
      expect(prisma.productImage.findMany).toHaveBeenCalledWith({
        where: { productId },
      });
    });
  });
});
