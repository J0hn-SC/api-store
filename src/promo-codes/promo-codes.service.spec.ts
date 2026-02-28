import { Test, TestingModule } from '@nestjs/testing';
import { PromoCodesService } from './promo-codes.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DiscountType } from './enums/discount-type.enum';
import { PromoCodeStatus } from './enums/promo-code-status.enum';

describe('PromoCodesService', () => {
  let service: PromoCodesService;
  let prisma: DeepMockProxy<PrismaClient>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PromoCodesService,
        { provide: PrismaService, useValue: mockDeep<PrismaClient>() },
      ],
    }).compile();

    service = module.get<PromoCodesService>(PromoCodesService);
    prisma = module.get(PrismaService) as unknown as DeepMockProxy<PrismaClient>;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const baseInput = {
      code: 'SUMMER20',
      discountType: DiscountType.PERCENTAGE,
      discountValue: 20,
    };

    it('should throw BadRequestException if both expirationDate and usageLimit are missing', async () => {
      // Act & Assert
      await expect(service.create(baseInput as any)).rejects.toThrow(BadRequestException);
      await expect(service.create(baseInput as any)).rejects.toThrow(
        'A promo code must have at least an expiration date or a usage limit to prevent infinite abuse.'
      );
    });

    it('should throw BadRequestException if discountType is PERCENTAGE and discountValue > 100', async () => {
      // Arrange
      const input = {
        ...baseInput,
        discountValue: 110,
        usageLimit: 100,
      };

      // Act & Assert
      await expect(service.create(input as any)).rejects.toThrow(BadRequestException);
      await expect(service.create(input as any)).rejects.toThrow(
        'For Percentage Discount, the discount value must be between 0 and 100'
      );
    });

    it('should successfully create a promo code when validation passes (expirationDate)', async () => {
      // Arrange
      const input = {
        ...baseInput,
        expirationDate: new Date(),
      };
      const mockResult = { id: 'uuid-123', ...input, usageCount: 0 };
      (prisma.promoCode.create as jest.Mock).mockResolvedValue(mockResult);

      // Act
      const result = await service.create(input as any);

      // Assert
      expect(prisma.promoCode.create).toHaveBeenCalledWith({
        data: { ...input, usageCount: 0 },
      });
      expect(result).toEqual(mockResult);
    });

    it('should successfully create a promo code when validation passes (usageLimit)', async () => {
      // Arrange
      const input = {
        ...baseInput,
        usageLimit: 50,
      };
      const mockResult = { id: 'uuid-456', ...input, usageCount: 0 };
      (prisma.promoCode.create as jest.Mock).mockResolvedValue(mockResult);

      // Act
      const result = await service.create(input as any);

      // Assert
      expect(prisma.promoCode.create).toHaveBeenCalledWith({
        data: { ...input, usageCount: 0 },
      });
      expect(result).toEqual(mockResult);
    });
  });

  describe('update', () => {
    const id = 'uuid-123';
    const updateInput = {
      usageLimit: 100,
      expirationDate: new Date(Date.now() + 1000000),
    };

    it('should throw BadRequestException if both expirationDate and usageLimit are missing', async () => {
      // Act & Assert
      await expect(service.update(id, {} as any)).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if the promo code does not exist', async () => {
      // Arrange
      (prisma.promoCode.findUnique as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(service.update(id, updateInput as any)).rejects.toThrow(NotFoundException);
    });

    describe('when usageCount > 0', () => {
      it('should throw BadRequestException if usageLimit is less than usageCount', async () => {
        // Arrange
        const promo = { id, usageCount: 50 };
        (prisma.promoCode.findUnique as jest.Mock).mockResolvedValue(promo);

        // Act & Assert
        await expect(service.update(id, { usageLimit: 30, expirationDate: new Date() } as any)).rejects.toThrow(BadRequestException);
        await expect(service.update(id, { usageLimit: 30, expirationDate: new Date() } as any)).rejects.toThrow(
          'Usage limit cannot be less than used count'
        );
      });

      it('should throw BadRequestException if expirationDate is in the past', async () => {
        // Arrange
        const promo = { id, usageCount: 10 };
        const pastDate = new Date(Date.now() - 10000);
        (prisma.promoCode.findUnique as jest.Mock).mockResolvedValue(promo);

        // Act & Assert
        await expect(service.update(id, { expirationDate: pastDate, usageLimit: 100 } as any)).rejects.toThrow(BadRequestException);
        await expect(service.update(id, { expirationDate: pastDate, usageLimit: 100 } as any)).rejects.toThrow(
          'Expiration date can not be less than current Date'
        );
      });
    });

    it('should successfully update the promo code when validation passes', async () => {
      // Arrange
      const promo = { id, usageCount: 0 };
      (prisma.promoCode.findUnique as jest.Mock).mockResolvedValue(promo);
      (prisma.promoCode.update as jest.Mock).mockResolvedValue({ id, ...updateInput });

      // Act
      const result = await service.update(id, updateInput as any);

      // Assert
      expect(prisma.promoCode.update).toHaveBeenCalledWith({
        where: { id },
        data: updateInput,
      });
      expect(result).toEqual({ id, ...updateInput });
    });
  });

  describe('disable', () => {
    it('should successfully disable a promo code', async () => {
      // Arrange
      const id = 'uuid-123';
      (prisma.promoCode.update as jest.Mock).mockResolvedValue({ id, status: PromoCodeStatus.DISABLED });

      // Act
      const result = await service.disable(id);

      // Assert
      expect(prisma.promoCode.update).toHaveBeenCalledWith({
        where: { id },
        data: { status: PromoCodeStatus.DISABLED },
      });
      expect(result.status).toBe(PromoCodeStatus.DISABLED);
    });
  });

  describe('validatePromoCode', () => {
    const code = 'SUMMER';

    it('should return promo if valid', async () => {
      // Arrange
      const mockPromo = { code, expirationDate: null, usageLimit: null, usageCount: 0 };
      (prisma.promoCode.findUnique as jest.Mock).mockResolvedValue(mockPromo);

      // Act
      const result = await service.validatePromoCode(code);

      // Assert
      expect(result).toEqual(mockPromo);
    });

    it('should throw NotFoundException if promo does not exist', async () => {
      // Arrange
      (prisma.promoCode.findUnique as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(service.validatePromoCode(code)).rejects.toThrow(NotFoundException);
      await expect(service.validatePromoCode(code)).rejects.toThrow('Promo code not valid');
    });

    it('should throw NotFoundException if promo is expired', async () => {
      // Arrange
      const expiredDate = new Date(Date.now() - 10000);
      const mockPromo = { code, expirationDate: expiredDate };
      (prisma.promoCode.findUnique as jest.Mock).mockResolvedValue(mockPromo);

      // Act & Assert
      await expect(service.validatePromoCode(code)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if usage limit reached', async () => {
      // Arrange
      const mockPromo = { code, usageLimit: 10, usageCount: 10 };
      (prisma.promoCode.findUnique as jest.Mock).mockResolvedValue(mockPromo);

      // Act & Assert
      await expect(service.validatePromoCode(code)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if amount is less than minimumPurchaseAmount', async () => {
      // Arrange
      const mockPromo = { code, minimumPurchaseAmount: 100 };
      (prisma.promoCode.findUnique as jest.Mock).mockResolvedValue(mockPromo);

      // Act & Assert
      await expect(service.validatePromoCode(code, 50)).rejects.toThrow(BadRequestException);
      await expect(service.validatePromoCode(code, 50)).rejects.toThrow('Minimum purchase amount of 100 is required');
    });
  });

  describe('findAll', () => {
    it('should return all promo codes ordered by createdAt desc', async () => {
      // Arrange
      const mockPromoCodes = [
        { id: '1', code: 'PROMO1', createdAt: new Date() },
        { id: '2', code: 'PROMO2', createdAt: new Date(Date.now() - 1000) },
      ];
      (prisma.promoCode.findMany as jest.Mock).mockResolvedValue(mockPromoCodes);

      // Act
      const result = await service.findAll();

      // Assert
      expect(prisma.promoCode.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(mockPromoCodes);
    });
  });

  describe('findById', () => {
    const id = 'uuid-123';

    it('should return a promo code if it exists', async () => {
      // Arrange
      const mockPromo = { id, code: 'SUMMER' };
      (prisma.promoCode.findUnique as jest.Mock).mockResolvedValue(mockPromo);

      // Act
      const result = await service.findById(id);

      // Assert
      expect(prisma.promoCode.findUnique).toHaveBeenCalledWith({ where: { id } });
      expect(result).toEqual(mockPromo);
    });

    it('should throw NotFoundException if the promo code does not exist', async () => {
      // Arrange
      (prisma.promoCode.findUnique as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(service.findById(id)).rejects.toThrow(NotFoundException);
      await expect(service.findById(id)).rejects.toThrow('Promo code not found');
    });
  });
});
