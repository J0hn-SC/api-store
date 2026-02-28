import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CartsService } from './carts.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { PromoCodesService } from 'src/promo-codes/promo-codes.service';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { EntityStatus, PrismaClient, Prisma } from '@prisma/client';
import { CartStatus } from './enums/cart-status.enum';

describe('CartsService', () => {
  let service: CartsService;
  let prisma: DeepMockProxy<PrismaClient>;
  let promoCodesService: DeepMockProxy<PromoCodesService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartsService,
        { provide: PrismaService, useValue: mockDeep<PrismaClient>() },
        { provide: PromoCodesService, useValue: mockDeep<PromoCodesService>() },
      ],
    }).compile();

    service = module.get<CartsService>(CartsService);
    prisma = module.get(PrismaService) as unknown as DeepMockProxy<PrismaClient>;
    promoCodesService = module.get(PromoCodesService) as unknown as DeepMockProxy<PromoCodesService>;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getOrCreateActiveCart', () => {
    const userId = 'user-123';

    it('should return an existing active cart if it exists', async () => {
      // Arrange
      const mockCart = { id: 'cart-123', userId, status: CartStatus.ACTIVE };
      (prisma.cart.findFirst as jest.Mock).mockResolvedValue(mockCart);

      // Act
      const result = await service.getOrCreateActiveCart(userId);

      // Assert
      expect(prisma.cart.findFirst).toHaveBeenCalledWith({
        where: { userId, status: CartStatus.ACTIVE },
      });
      expect(prisma.cart.create).not.toHaveBeenCalled();
      expect(result).toEqual(mockCart);
    });

    it('should create and return a new active cart if none exists', async () => {
      // Arrange
      const mockCart = { id: 'cart-456', userId, status: CartStatus.ACTIVE };
      (prisma.cart.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.cart.create as jest.Mock).mockResolvedValue(mockCart);

      // Act
      const result = await service.getOrCreateActiveCart(userId);

      // Assert
      expect(prisma.cart.findFirst).toHaveBeenCalledWith({
        where: { userId, status: CartStatus.ACTIVE },
      });
      expect(prisma.cart.create).toHaveBeenCalledWith({
        data: { userId },
      });
      expect(result).toEqual(mockCart);
    });
  });

  describe('addItem', () => {
    const userId = 'user-123';
    const productId = 'product-123';
    const cartId = 'cart-123';

    it('should throw NotFoundException if product is not found or not active', async () => {
      // Arrange
      (prisma.product.findUnique as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(service.addItem(userId, productId, 1)).rejects.toThrow(NotFoundException);
      await expect(service.addItem(userId, productId, 1)).rejects.toThrow('Product not found');
    });

    it('should throw ConflictException if quantity exceeds available stock (new item)', async () => {
      // Arrange
      const product = { id: productId, stock: 5, status: EntityStatus.ACTIVE };
      (prisma.product.findUnique as jest.Mock).mockResolvedValue(product);
      (prisma.cart.findFirst as jest.Mock).mockResolvedValue({ id: cartId });
      (prisma.cartItem.findUnique as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(service.addItem(userId, productId, 10)).rejects.toThrow(ConflictException);
      await expect(service.addItem(userId, productId, 10)).rejects.toThrow('Quantity of item exceeds available stock');
    });

    it('should create a new cart item if it does not exist', async () => {
      // Arrange
      const product = { id: productId, stock: 10, status: EntityStatus.ACTIVE };
      const cart = { id: cartId, userId };
      (prisma.product.findUnique as jest.Mock).mockResolvedValue(product);
      (prisma.cart.findFirst as jest.Mock).mockResolvedValue(cart);
      (prisma.cartItem.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.cartItem.create as jest.Mock).mockResolvedValue({ id: 'item-1', cartId, productId, quantity: 2 });

      // Act
      const result = await service.addItem(userId, productId, 2);

      // Assert
      expect(prisma.cartItem.create).toHaveBeenCalledWith({
        data: { cartId, productId, quantity: 2 },
      });
      expect(result).toEqual(cart);
    });

    it('should throw ConflictException if updated quantity exceeds stock (existing item)', async () => {
      // Arrange
      const product = { id: productId, stock: 10, status: EntityStatus.ACTIVE };
      const cart = { id: cartId, userId };
      const existingItem = { id: 'item-1', cartId, productId, quantity: 8 };
      (prisma.product.findUnique as jest.Mock).mockResolvedValue(product);
      (prisma.cart.findFirst as jest.Mock).mockResolvedValue(cart);
      (prisma.cartItem.findUnique as jest.Mock).mockResolvedValue(existingItem);

      // Act & Assert
      await expect(service.addItem(userId, productId, 5)).rejects.toThrow(ConflictException);
    });

    it('should update existing item quantity if it exists', async () => {
      // Arrange
      const product = { id: productId, stock: 20, status: EntityStatus.ACTIVE };
      const cart = { id: cartId, userId };
      const existingItem = { id: 'item-1', cartId, productId, quantity: 5 };
      (prisma.product.findUnique as jest.Mock).mockResolvedValue(product);
      (prisma.cart.findFirst as jest.Mock).mockResolvedValue(cart);
      (prisma.cartItem.findUnique as jest.Mock).mockResolvedValue(existingItem);

      // Act
      const result = await service.addItem(userId, productId, 3);

      // Assert
      expect(prisma.cartItem.update).toHaveBeenCalledWith({
        where: { id: existingItem.id },
        data: { quantity: 8 },
      });
      expect(result).toEqual(cart);
    });
  });

  describe('updateItem', () => {
    const userId = 'user-123';
    const itemId = 'item-123';
    const productId = 'product-123';

    it('should throw NotFoundException if item is not found or belongs to another user', async () => {
      // Arrange
      (prisma.cartItem.findUnique as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(service.updateItem(userId, itemId, 5)).rejects.toThrow(NotFoundException);
      await expect(service.updateItem(userId, itemId, 5)).rejects.toThrow('Item not found');
    });

    it('should throw NotFoundException if product is not found or not active', async () => {
      // Arrange
      const cart = { userId };
      const item = { id: itemId, productId, cart };
      (prisma.cartItem.findUnique as jest.Mock).mockResolvedValue(item);
      (prisma.product.findUnique as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(service.updateItem(userId, itemId, 5)).rejects.toThrow(NotFoundException);
      await expect(service.updateItem(userId, itemId, 5)).rejects.toThrow('Product not found');
    });

    it('should throw ConflictException if quantity exceeds available stock', async () => {
      // Arrange
      const cart = { userId };
      const item = { id: itemId, productId, cart };
      const product = { id: productId, stock: 10, status: EntityStatus.ACTIVE };
      (prisma.cartItem.findUnique as jest.Mock).mockResolvedValue(item);
      (prisma.product.findUnique as jest.Mock).mockResolvedValue(product);

      // Act & Assert
      await expect(service.updateItem(userId, itemId, 15)).rejects.toThrow(ConflictException);
      await expect(service.updateItem(userId, itemId, 15)).rejects.toThrow('Quantity of item exceeds available stock');
    });

    it('should successfully update the item quantity when validation passes', async () => {
      // Arrange
      const cart = { userId };
      const item = { id: itemId, productId, cart };
      const product = { id: productId, stock: 20, status: EntityStatus.ACTIVE };
      const mockUpdatedItem = { id: itemId, quantity: 10 };
      (prisma.cartItem.findUnique as jest.Mock).mockResolvedValue(item);
      (prisma.product.findUnique as jest.Mock).mockResolvedValue(product);
      (prisma.cartItem.update as jest.Mock).mockResolvedValue(mockUpdatedItem);

      // Act
      const result = await service.updateItem(userId, itemId, 10);

      // Assert
      expect(prisma.cartItem.update).toHaveBeenCalledWith({
        where: { id: itemId },
        data: { quantity: 10 },
      });
      expect(result).toEqual(mockUpdatedItem);
    });
  });

  describe('removeItem', () => {
    const userId = 'user-123';
    const itemId = 'item-123';

    it('should throw NotFoundException if item is not found or belongs to another user', async () => {
      // Arrange
      (prisma.cartItem.findUnique as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(service.removeItem(userId, itemId)).rejects.toThrow(NotFoundException);
      await expect(service.removeItem(userId, itemId)).rejects.toThrow('Item not found');
    });

    it('should successfully delete the item and return the active cart', async () => {
      // Arrange
      const cart = { id: 'cart-123', userId, status: CartStatus.ACTIVE };
      const item = { id: itemId, cart };
      (prisma.cartItem.findUnique as jest.Mock).mockResolvedValue(item);
      (prisma.cartItem.delete as jest.Mock).mockResolvedValue(item);
      (prisma.cart.findFirst as jest.Mock).mockResolvedValue(cart);

      // Act
      const result = await service.removeItem(userId, itemId);

      // Assert
      expect(prisma.cartItem.delete).toHaveBeenCalledWith({ where: { id: itemId } });
      expect(prisma.cart.findFirst).toHaveBeenCalledWith({
        where: { userId, status: CartStatus.ACTIVE },
      });
      expect(result).toEqual(cart);
    });
  });

  describe('clearCart', () => {
    const userId = 'user-123';
    const cartId = 'cart-123';

    it('should successfully delete all items in the cart and return the active cart', async () => {
      // Arrange
      const cart = { id: cartId, userId, status: CartStatus.ACTIVE };
      (prisma.cart.findFirst as jest.Mock).mockResolvedValue(cart);
      (prisma.cartItem.deleteMany as jest.Mock).mockResolvedValue({ count: 5 });

      // Act
      const result = await service.clearCart(userId);

      // Assert
      expect(prisma.cartItem.deleteMany).toHaveBeenCalledWith({
        where: { cartId },
      });
      expect(result).toEqual(cart);
    });
  });

  describe('validatePromoCode', () => {
    const userId = 'user-123';
    const code = 'SUMMER21';
    const cartId = 'cart-123';

    it('should calculate subtotal correctly and update cart with promoCodeId if valid', async () => {
      // Arrange
      const mockCart = {
        id: cartId,
        userId,
        items: [
          { product: { price: new Prisma.Decimal(100) }, quantity: 2 },
          { product: { price: new Prisma.Decimal(50) }, quantity: 1 },
        ],
      };
      const mockPromoCode = { id: 'promo-123', code };
      const mockUpdatedCart = { ...mockCart, promoCodeId: 'promo-123' };

      (prisma.cart.findFirst as jest.Mock).mockResolvedValue(mockCart);
      (promoCodesService.validatePromoCode as jest.Mock).mockResolvedValue(mockPromoCode);
      (prisma.cart.update as jest.Mock).mockResolvedValue(mockUpdatedCart);

      // Act
      const result = await service.validatePromoCode(userId, code);

      // Assert
      expect(promoCodesService.validatePromoCode).toHaveBeenCalledWith(code, new Prisma.Decimal(250));
      expect(prisma.cart.update).toHaveBeenCalledWith({
        where: { id: cartId },
        data: { promoCodeId: 'promo-123' },
      });
      expect(result).toEqual(mockUpdatedCart);
    });

    it('should return original cart if promoCodeService returns null', async () => {
      // Arrange
      const mockCart = {
        id: cartId,
        userId,
        items: [{ product: { price: new Prisma.Decimal(100) }, quantity: 1 }],
      };
      (prisma.cart.findFirst as jest.Mock).mockResolvedValue(mockCart);
      (promoCodesService.validatePromoCode as jest.Mock).mockResolvedValue(null);

      // Act
      const result = await service.validatePromoCode(userId, code);

      // Assert
      expect(result).toEqual(mockCart);
      expect(prisma.cart.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if cart is not found', async () => {
      // Arrange
      (prisma.cart.findFirst as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(service.validatePromoCode(userId, code)).rejects.toThrow(NotFoundException);
    });
  });
});
