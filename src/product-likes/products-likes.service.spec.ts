import { Test, TestingModule } from '@nestjs/testing';
import { ProductLikesService } from './products-likes.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { Prisma, PrismaClient, OrderStatus } from '@prisma/client';
import { ConflictException, NotFoundException } from '@nestjs/common';

describe('ProductLikesService', () => {
  let service: ProductLikesService;
  let prisma: DeepMockProxy<PrismaClient>;
  let mailService: DeepMockProxy<MailService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductLikesService,
        { provide: PrismaService, useValue: mockDeep<PrismaClient>() },
        { provide: MailService, useValue: mockDeep<MailService>() },
      ],
    }).compile();

    service = module.get<ProductLikesService>(ProductLikesService);
    prisma = module.get(PrismaService) as unknown as DeepMockProxy<PrismaClient>;
    mailService = module.get(MailService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('likeProduct', () => {
    const userId = 'user-123';
    const productId = 'prod-123';

    it('should successfully like a product', async () => {
      // Arrange
      const mockLike = { userId, productId, createdAt: new Date() };
      (prisma as any).productLike = { create: jest.fn().mockResolvedValue(mockLike) };

      // Act
      const result = await service.likeProduct(userId, productId);

      // Assert
      expect((prisma as any).productLike.create).toHaveBeenCalledWith({
        data: { userId, productId },
      });
      expect(result).toEqual(mockLike);
    });

    it('should throw ConflictException if like already exists (P2002)', async () => {
      // Arrange
      const prismaError = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '5.0.0',
      });
      (prisma as any).productLike = { create: jest.fn().mockRejectedValue(prismaError) };

      // Act & Assert
      await expect(service.likeProduct(userId, productId)).rejects.toThrow(ConflictException);
      await expect(service.likeProduct(userId, productId)).rejects.toThrow('Like already exists');
    });

    it('should throw ConflictException for generic errors', async () => {
      // Arrange
      (prisma as any).productLike = { create: jest.fn().mockRejectedValue(new Error('Some error')) };

      // Act & Assert
      await expect(service.likeProduct(userId, productId)).rejects.toThrow(ConflictException);
    });
  });

  describe('unlikeProduct', () => {
    const userId = 'user-123';
    const productId = 'prod-123';

    it('should successfully unlike a product', async () => {
      // Arrange
      const mockLike = { userId, productId, createdAt: new Date() };
      (prisma as any).productLike = { delete: jest.fn().mockResolvedValue(mockLike) };

      // Act
      const result = await service.unlikeProduct(userId, productId);

      // Assert
      expect((prisma as any).productLike.delete).toHaveBeenCalledWith({
        where: {
          userId_productId: { userId, productId },
        },
      });
      expect(result).toEqual(mockLike);
    });

    it('should throw NotFoundException if like does not exist (P2025)', async () => {
      // Arrange
      const prismaError = new Prisma.PrismaClientKnownRequestError('Record to delete not found', {
        code: 'P2025',
        clientVersion: '5.0.0',
      });
      (prisma as any).productLike = { delete: jest.fn().mockRejectedValue(prismaError) };

      // Act & Assert
      await expect(service.unlikeProduct(userId, productId)).rejects.toThrow(NotFoundException);
      await expect(service.unlikeProduct(userId, productId)).rejects.toThrow('Like does not exists or it has been already deleted');
    });

    it('should throw NotFoundException for generic errors', async () => {
      // Arrange
      (prisma as any).productLike = { delete: jest.fn().mockRejectedValue(new Error('Some error')) };

      // Act & Assert
      await expect(service.unlikeProduct(userId, productId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getCountsByProductIds', () => {
    it('should return an empty object if no product IDs are provided', async () => {
      // Arrange
      (prisma as any).productLike = { groupBy: jest.fn().mockResolvedValue([]) };

      // Act
      const result = await service.getCountsByProductIds([]);

      // Assert
      expect((prisma as any).productLike.groupBy).toHaveBeenCalledWith({
        by: ['productId'],
        _count: { productId: true },
        where: { productId: { in: [] } },
      });
      expect(result).toEqual({});
    });

    it('should return a record with counts for the provided product IDs', async () => {
      // Arrange
      const productIds = ['p1', 'p2'];
      const mockGroupByResult = [
        { productId: 'p1', _count: { productId: 5 } },
        { productId: 'p2', _count: { productId: 3 } },
      ];
      (prisma as any).productLike = { groupBy: jest.fn().mockResolvedValue(mockGroupByResult) };

      // Act
      const result = await service.getCountsByProductIds(productIds);

      // Assert
      expect(result).toEqual({ p1: 5, p2: 3 });
    });

    it('should correctly handle the case where some products have no likes', async () => {
      // Arrange
      const productIds = ['p1', 'p2', 'p3'];
      const mockGroupByResult = [
        { productId: 'p1', _count: { productId: 5 } },
        // p2 and p3 are missing from the result because they have no likes
      ];
      (prisma as any).productLike = { groupBy: jest.fn().mockResolvedValue(mockGroupByResult) };

      // Act
      const result = await service.getCountsByProductIds(productIds);

      // Assert
      expect(result).toEqual({ p1: 5 });
      // Note: The current implementation only returns keys present in the groupBy result.
    });
  });

  describe('getIsLikedByProductIds', () => {
    const userId = 'user-123';

    it('should return an empty object if no product IDs are provided', async () => {
      // Arrange
      (prisma as any).productLike = { findMany: jest.fn().mockResolvedValue([]) };

      // Act
      const result = await service.getIsLikedByProductIds([], userId);

      // Assert
      expect((prisma as any).productLike.findMany).toHaveBeenCalledWith({
        where: {
          userId: userId,
          productId: { in: [] },
        },
        select: { productId: true },
      });
      expect(result).toEqual({});
    });

    it('should return a record with true for products liked by the user', async () => {
      // Arrange
      const productIds = ['p1', 'p2', 'p3'];
      const mockFindManyResult = [
        { productId: 'p1' },
        { productId: 'p3' },
      ];
      (prisma as any).productLike = { findMany: jest.fn().mockResolvedValue(mockFindManyResult) };

      // Act
      const result = await service.getIsLikedByProductIds(productIds, userId);

      // Assert
      expect(result).toEqual({ p1: true, p3: true });
    });

    it('should correctly handle the case where the user has not liked any of the provided products', async () => {
      // Arrange
      const productIds = ['p1', 'p2'];
      (prisma as any).productLike = { findMany: jest.fn().mockResolvedValue([]) };

      // Act
      const result = await service.getIsLikedByProductIds(productIds, userId);

      // Assert
      expect(result).toEqual({});
    });
  });

  describe('notifyLowStockToInterestedUsers', () => {
    const orderId = 'order-123';
    const productId = 'prod-123';

    it('should return early if order is not found', async () => {
      // Arrange
      (prisma.order.findUnique as jest.Mock).mockResolvedValue(null);

      // Act
      await service.notifyLowStockToInterestedUsers(orderId);

      // Assert
      expect(prisma.order.findUnique).toHaveBeenCalled();
      expect(prisma.product.findFirst).not.toHaveBeenCalled();
    });

    it('should skip products that are not low stock (<= 3)', async () => {
      // Arrange
      const mockOrder = { id: orderId, items: [{ productId }] };
      (prisma.order.findUnique as jest.Mock).mockResolvedValue(mockOrder);
      (prisma.product.findFirst as jest.Mock).mockResolvedValue(null); // findFirst returns null for stock > 3 per query

      // Act
      await service.notifyLowStockToInterestedUsers(orderId);

      // Assert
      expect(prisma.product.findFirst).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: productId, stock: { lte: 3 } },
      }));
      expect(prisma.productLike.findMany).not.toHaveBeenCalled();
    });

    it('should skip products if they have no likes', async () => {
      // Arrange
      const mockOrder = { id: orderId, items: [{ productId }] };
      const mockProduct = { id: productId, name: 'Low Stock Product' };
      (prisma.order.findUnique as jest.Mock).mockResolvedValue(mockOrder);
      (prisma.product.findFirst as jest.Mock).mockResolvedValue(mockProduct);
      (prisma.productLike.findMany as jest.Mock).mockResolvedValue([]);

      // Act
      await service.notifyLowStockToInterestedUsers(orderId);

      // Assert
      expect(prisma.productLike.findMany).toHaveBeenCalled();
      expect(prisma.orderItem.findMany).not.toHaveBeenCalled();
    });

    it('should filter out users who have already purchased the product and send notifications', async () => {
      // Arrange
      const mockOrder = { id: orderId, items: [{ productId }] };
      const mockProduct = { id: productId, name: 'Low Stock Product' };
      const mockLikes = [
        { userId: 'u1', user: { email: 'u1@ex.com' } },
        { userId: 'u2', user: { email: 'u2@ex.com' } },
      ];
      const mockSuccessfulOrders = [
        { order: { userId: 'u1' } }, // u1 has already purchased
      ];

      (prisma.order.findUnique as jest.Mock).mockResolvedValue(mockOrder);
      (prisma.product.findFirst as jest.Mock).mockResolvedValue(mockProduct);
      (prisma.productLike.findMany as jest.Mock).mockResolvedValue(mockLikes);
      (prisma.orderItem.findMany as jest.Mock).mockResolvedValue(mockSuccessfulOrders);

      // Act
      await service.notifyLowStockToInterestedUsers(orderId);

      // Assert
      expect(prisma.orderItem.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: {
          productId: productId,
          order: {
            status: { in: [OrderStatus.PAID, OrderStatus.PROCESSING, OrderStatus.SHIPPED, OrderStatus.DELIVERED] },
          },
        },
      }));

      // Only u2 should be notified
      expect(mailService.sendMassiveLowStockAlert).toHaveBeenCalledWith(
        [{ email: 'u2@ex.com' }],
        mockProduct
      );
    });
  });
});
