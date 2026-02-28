import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from './orders.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { CartsService } from 'src/carts/carts.service';
import { PromoCodesService } from 'src/promo-codes/promo-codes.service';
import { PaymentsService } from 'src/payments/payments.service';
import { CaslAbilityFactory } from 'src/casl/factories/casl-ability.factory';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { Action } from 'rxjs/internal/scheduler/Action';
import { PrismaClient, OrderStatus, Prisma, Role } from '@prisma/client';
import { DiscountType } from 'src/promo-codes/enums/discount-type.enum';

describe('OrdersService', () => {
  let service: OrdersService;
  let prisma: DeepMockProxy<PrismaClient>;
  let cartsService: DeepMockProxy<CartsService>;
  let promoCodesService: DeepMockProxy<PromoCodesService>;
  let paymentsService: DeepMockProxy<PaymentsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: mockDeep<PrismaClient>() },
        { provide: CartsService, useValue: mockDeep<CartsService>() },
        { provide: PromoCodesService, useValue: mockDeep<PromoCodesService>() },
        { provide: PaymentsService, useValue: mockDeep<PaymentsService>() },
        { provide: CaslAbilityFactory, useValue: mockDeep<CaslAbilityFactory>() },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    prisma = module.get(PrismaService) as unknown as DeepMockProxy<PrismaClient>;
    cartsService = module.get(CartsService) as unknown as DeepMockProxy<CartsService>;
    promoCodesService = module.get(PromoCodesService) as unknown as DeepMockProxy<PromoCodesService>;
    paymentsService = module.get(PaymentsService) as unknown as DeepMockProxy<PaymentsService>;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('resolveAddress', () => {
    const userId = 'user-123';
    const addressId = 'addr-123';
    const addressInput = {
      addressLine1: '123 Main St',
      city: 'Springfield',
      stateProvince: 'IL',
      countryCode: 'USA',
      postalCode: '62704',
    };

    it('should throw BadRequestException if both addressId and address are missing', async () => {
      await expect((service as any).resolveAddress(userId)).rejects.toThrow(BadRequestException);
      await expect((service as any).resolveAddress(userId)).rejects.toThrow('Shipping address is required');
    });

    it('should throw ConflictException if both addressId and address are provided', async () => {
      await expect((service as any).resolveAddress(userId, addressId, addressInput)).rejects.toThrow(ConflictException);
      await expect((service as any).resolveAddress(userId, addressId, addressInput)).rejects.toThrow('Provide either an addressId or a address, not both');
    });

    it('should return address if found by addressId and userId', async () => {
      // Arrange
      const mockAddress = { id: addressId, userId, ...addressInput };
      (prisma.address.findFirst as jest.Mock).mockResolvedValue(mockAddress);

      // Act
      const result = await (service as any).resolveAddress(userId, addressId);

      // Assert
      expect(prisma.address.findFirst).toHaveBeenCalledWith({
        where: { id: addressId, userId },
      });
      expect(result).toEqual(mockAddress);
    });

    it('should throw NotFoundException if addressId is provided but not found', async () => {
      // Arrange
      (prisma.address.findFirst as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect((service as any).resolveAddress(userId, addressId)).rejects.toThrow(NotFoundException);
      await expect((service as any).resolveAddress(userId, addressId)).rejects.toThrow('Address not found');
    });

    it('should create and return a new address if address object is provided', async () => {
      // Arrange
      const mockAddress = { id: 'new-addr', userId, ...addressInput };
      (prisma.address.create as jest.Mock).mockResolvedValue(mockAddress);

      // Act
      const result = await (service as any).resolveAddress(userId, undefined, addressInput);

      // Assert
      expect(prisma.address.create).toHaveBeenCalledWith({
        data: { ...addressInput, userId },
      });
      expect(result).toEqual(mockAddress);
    });
  });

  describe('createOrderFromCart', () => {
    const userId = 'user-123';
    const cartId = 'cart-123';
    const addressId = 'addr-123';
    const orderId = 'order-123';
    const input = { addressId };

    it('should throw BadRequestException if an order is in progress', async () => {
      // Arrange
      (prisma.order.findFirst as jest.Mock).mockResolvedValue({ id: 'existing-order' });

      // Act & Assert
      await expect(service.createOrderFromCart(userId, input)).rejects.toThrow(BadRequestException);
      await expect(service.createOrderFromCart(userId, input)).rejects.toThrow('You have an order in progress');
    });

    it('should throw BadRequestException if cart is empty or not found', async () => {
      // Arrange
      (prisma.order.findFirst as jest.Mock).mockResolvedValue(null);
      (cartsService.getActiveCart as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(service.createOrderFromCart(userId, input)).rejects.toThrow(BadRequestException);
      (cartsService.getActiveCart as jest.Mock).mockResolvedValue({ items: [] });
      await expect(service.createOrderFromCart(userId, input)).rejects.toThrow('Cart is empty or not found');
    });

    it('should successfully create an order and return the result with clientSecret', async () => {
      // Arrange
      const mockCart = {
        id: cartId,
        items: [
          {
            productId: 'prod-1',
            quantity: 2,
            product: { name: 'Product 1', price: new Prisma.Decimal(100) },
          },
        ],
        promoCodeId: null,
      };
      const mockAddress = { id: addressId, userId };
      const mockOrder = { id: orderId, total: new Prisma.Decimal(200) };
      const mockPaymentIntent = { clientSecret: 'secret-123' };

      (prisma.order.findFirst as jest.Mock).mockResolvedValue(null);
      (cartsService.getActiveCart as jest.Mock).mockResolvedValue(mockCart);

      // Mocking resolveAddress (indirectly via prisma.address.findFirst)
      (prisma.address.findFirst as jest.Mock).mockResolvedValue(mockAddress);

      // Mocking transaction
      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        return await callback(prisma);
      });
      (prisma.product.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
      (prisma.order.create as jest.Mock).mockResolvedValue(mockOrder);
      (paymentsService.createPaymentIntent as jest.Mock).mockResolvedValue(mockPaymentIntent);

      // Act
      const result = await service.createOrderFromCart(userId, input);

      // Assert
      expect(prisma.order.create).toHaveBeenCalled();
      expect(paymentsService.createPaymentIntent).toHaveBeenCalledWith(userId, orderId, mockOrder.total);
      expect(result).toEqual({ ...mockOrder, clientSecret: 'secret-123' });
    });

    it('should throw Error if stock is insufficient', async () => {
      // Arrange
      const mockCart = {
        id: cartId,
        items: [{ productId: 'prod-1', quantity: 10, product: { name: 'Product 1', price: new Prisma.Decimal(10) } }],
      };
      (prisma.order.findFirst as jest.Mock).mockResolvedValue(null);
      (cartsService.getActiveCart as jest.Mock).mockResolvedValue(mockCart);
      (prisma.address.findFirst as jest.Mock).mockResolvedValue({ id: addressId });

      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        return await callback(prisma);
      });
      (prisma.product.updateMany as jest.Mock).mockResolvedValue({ count: 0 });

      // Act & Assert
      await expect(service.createOrderFromCart(userId, input)).rejects.toThrow('Product Product 1 has no enough stock.');
    });
  });

  describe('createOrderFromSingleProduct', () => {
    const productId = 'prod-123';
    const email = 'test@example.com';
    const addressInput = {
      addressLine1: '123 Main St',
      city: 'Springfield',
      stateProvince: 'IL',
      countryCode: 'USA',
      postalCode: '62704',
    };
    const input = { productId, quantity: 2, address: addressInput };

    it('should throw NotFoundException if product is not found', async () => {
      // Arrange
      (prisma.product.findUnique as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(service.createOrderFromSingleProduct(input, email)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if guest user provides no address', async () => {
      // Arrange
      const guestInput = { productId, quantity: 1 };
      (prisma.product.findUnique as jest.Mock).mockResolvedValue({ id: productId });

      // Act & Assert
      await expect(service.createOrderFromSingleProduct(guestInput as any, email)).rejects.toThrow(BadRequestException);
    });

    it('should successfully create an order for a guest user', async () => {
      // Arrange
      const mockProduct = { id: productId, name: 'Product 1', price: new Prisma.Decimal(100), stripePriceId: 'price-123' };
      const mockOrder = { id: 'order-123', total: new Prisma.Decimal(200) };
      const mockPayment = { sessionUrl: 'https://stripe.com/session' };

      (prisma.product.findUnique as jest.Mock).mockResolvedValue(mockProduct);
      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => await callback(prisma));
      (prisma.product.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
      (prisma.order.create as jest.Mock).mockResolvedValue(mockOrder);
      (paymentsService.createPaymentLink as jest.Mock).mockResolvedValue(mockPayment);

      // Act
      const result = await service.createOrderFromSingleProduct(input, email);

      // Assert
      expect(prisma.order.create).toHaveBeenCalled();
      expect(paymentsService.createPaymentLink).toHaveBeenCalledWith(email, 'order-123', 'price-123', 2, undefined);
      expect(result).toEqual({ ...mockOrder, sessionUrl: mockPayment.sessionUrl });
    });

    it('should successfully create an order for a registered user', async () => {
      // Arrange
      const userId = 'user-123';
      const mockProduct = { id: productId, name: 'Product 1', price: new Prisma.Decimal(100), stripePriceId: 'price-123' };
      const mockOrder = { id: 'order-123', total: new Prisma.Decimal(200) };
      const mockPayment = { sessionUrl: 'https://stripe.com/session' };
      const mockAddress = { id: 'addr-123', userId };

      (prisma.product.findUnique as jest.Mock).mockResolvedValue(mockProduct);
      (prisma.address.findFirst as jest.Mock).mockResolvedValue(mockAddress);
      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => await callback(prisma));
      (prisma.product.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
      (prisma.order.create as jest.Mock).mockResolvedValue(mockOrder);
      (paymentsService.createPaymentLink as jest.Mock).mockResolvedValue(mockPayment);

      // Act
      const result = await service.createOrderFromSingleProduct(input, email, userId);

      // Assert
      expect(prisma.order.create).toHaveBeenCalled();
      expect(paymentsService.createPaymentLink).toHaveBeenCalledWith(email, 'order-123', 'price-123', 2, userId);
      expect(result).toEqual({ ...mockOrder, sessionUrl: mockPayment.sessionUrl });
    });

    it('should throw ConflictException if stock is insufficient', async () => {
      // Arrange
      (prisma.product.findUnique as jest.Mock).mockResolvedValue({ id: productId, name: 'Product 1', price: new Prisma.Decimal(10) });
      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => await callback(prisma));
      (prisma.product.updateMany as jest.Mock).mockResolvedValue({ count: 0 });

      // Act & Assert
      await expect(service.createOrderFromSingleProduct(input, email)).rejects.toThrow(ConflictException);
    });
  });

  describe('findById', () => {
    const orderId = 'order-123';

    it('should throw NotFoundException if order is not found', async () => {
      // Arrange
      (prisma.order.findUnique as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(service.findById(orderId)).rejects.toThrow(NotFoundException);
      await expect(service.findById(orderId)).rejects.toThrow('Order not found');
    });

    it('should throw NotFoundException if payment is not found', async () => {
      // Arrange
      (prisma.order.findUnique as jest.Mock).mockResolvedValue({ id: orderId });
      (prisma.payment.findFirst as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(service.findById(orderId)).rejects.toThrow(NotFoundException);
      await expect(service.findById(orderId)).rejects.toThrow('Payment not found');
    });

    it('should return order with clientSecret and sessionUrl from payment metadata', async () => {
      // Arrange
      const mockOrder = { id: orderId, userId: 'user-123' };
      const mockPayment = {
        id: 'pay-123',
        metadata: {
          secretClient: 'secret-123',
          sessionUrl: 'https://stripe.com/session',
        },
      };
      (prisma.order.findUnique as jest.Mock).mockResolvedValue(mockOrder);
      (prisma.payment.findFirst as jest.Mock).mockResolvedValue(mockPayment);

      // Act
      const result = await service.findById(orderId);

      // Assert
      expect(prisma.order.findUnique).toHaveBeenCalledWith({ where: { id: orderId } });
      expect(prisma.payment.findFirst).toHaveBeenCalledWith({ where: { orderId } });
      expect(result).toEqual({
        ...mockOrder,
        clientSecret: 'secret-123',
        sessionUrl: 'https://stripe.com/session',
      });
    });
  });

  describe('findOrders', () => {
    const userId = 'user-123';
    const mockOrders = [{ id: 'order-1' }, { id: 'order-2' }];

    it('should filter by userId when role is CLIENT', async () => {
      // Arrange
      (prisma.order.findMany as jest.Mock).mockResolvedValue(mockOrders);

      // Act
      const result = await service.findOrders(userId, Role.CLIENT);

      // Assert
      expect(prisma.order.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          userId: userId,
          deliveryUserId: undefined,
        }),
      }));
      expect(result).toEqual(mockOrders);
    });

    it('should filter by deliveryUserId when role is DELIVERY', async () => {
      // Arrange
      (prisma.order.findMany as jest.Mock).mockResolvedValue(mockOrders);

      // Act
      const result = await service.findOrders(userId, Role.DELIVERY);

      // Assert
      expect(prisma.order.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          userId: undefined,
          deliveryUserId: userId,
        }),
      }));
    });

    it('should not filter by user when role is ADMIN', async () => {
      // Arrange
      (prisma.order.findMany as jest.Mock).mockResolvedValue(mockOrders);

      // Act
      const result = await service.findOrders(userId, Role.MANAGER);

      // Assert
      expect(prisma.order.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          userId: undefined,
          deliveryUserId: undefined,
        }),
      }));
    });

    it('should apply provided filters and pagination', async () => {
      // Arrange
      const filter = {
        status: OrderStatus.PAID,
        minTotal: 100,
        maxTotal: 500,
        fromDate: new Date('2023-01-01'),
        toDate: new Date('2023-12-31'),
        take: 10,
        skip: 5,
      };
      (prisma.order.findMany as jest.Mock).mockResolvedValue(mockOrders);

      // Act
      await service.findOrders(userId, Role.MANAGER, filter);

      // Assert
      expect(prisma.order.findMany).toHaveBeenCalledWith({
        where: {
          userId: undefined,
          deliveryUserId: undefined,
          status: OrderStatus.PAID,
          total: { gte: 100, lte: 500 },
          createdAt: { gte: filter.fromDate, lte: filter.toDate },
        },
        take: 10,
        skip: 5,
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('ensureStatus', () => {
    const orderId = 'order-123';

    it('should throw NotFoundException if order is not found', async () => {
      // Arrange
      (prisma.order.findUnique as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect((service as any).ensureStatus(orderId, [OrderStatus.PAID])).rejects.toThrow(NotFoundException);
      await expect((service as any).ensureStatus(orderId, [OrderStatus.PAID])).rejects.toThrow('Order not found');
    });

    it('should throw BadRequestException if status is not allowed', async () => {
      // Arrange
      (prisma.order.findUnique as jest.Mock).mockResolvedValue({ status: OrderStatus.PENDING });

      // Act & Assert
      await expect((service as any).ensureStatus(orderId, [OrderStatus.PAID, OrderStatus.PROCESSING])).rejects.toThrow(BadRequestException);
      await expect((service as any).ensureStatus(orderId, [OrderStatus.PAID, OrderStatus.PROCESSING])).rejects.toThrow(
        'Invalid status transition. Current status: PENDING. Allowed statuses: PAID, PROCESSING'
      );
    });

    it('should return order if status is allowed', async () => {
      // Arrange
      const mockOrder = { status: OrderStatus.PAID };
      (prisma.order.findUnique as jest.Mock).mockResolvedValue(mockOrder);

      // Act
      const result = await (service as any).ensureStatus(orderId, [OrderStatus.PAID]);

      // Assert
      expect(prisma.order.findUnique).toHaveBeenCalledWith({
        where: { id: orderId },
        select: { status: true },
      });
      expect(result).toEqual(mockOrder);
    });
  });

  describe('processOrder', () => {
    const orderId = 'order-123';

    it('should successfully update order status to PROCESSING', async () => {
      // Arrange
      const mockOrder = { id: orderId, status: OrderStatus.PAID };
      (prisma.order.findUnique as jest.Mock).mockResolvedValue(mockOrder);
      (prisma.order.update as jest.Mock).mockResolvedValue({ ...mockOrder, status: OrderStatus.PROCESSING });

      // Act
      const result = await service.processOrder(orderId);

      // Assert
      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: orderId },
        data: { status: OrderStatus.PROCESSING },
      });
      expect(result.status).toBe(OrderStatus.PROCESSING);
    });
  });

  describe('shipOrder', () => {
    const orderId = 'order-123';
    const deliveryUserId = 'delivery-user-123';

    it('should successfully update order status to SHIPPED and set deliveryUserId', async () => {
      // Arrange
      const mockOrder = { id: orderId, status: OrderStatus.PROCESSING };
      (prisma.order.findUnique as jest.Mock).mockResolvedValue(mockOrder);
      (prisma.order.update as jest.Mock).mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.SHIPPED,
        deliveryUserId,
      });

      // Act
      const result = await service.shipOrder(orderId, deliveryUserId);

      // Assert
      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: orderId },
        data: {
          status: OrderStatus.SHIPPED,
          deliveryUserId,
        },
      });
      expect(result.status).toBe(OrderStatus.SHIPPED);
      expect(result.deliveryUserId).toBe(deliveryUserId);
    });
  });

  describe('cancelOrder', () => {
    const orderId = 'order-123';

    it('should throw NotFoundException if order is not found', async () => {
      // Arrange
      (prisma.order.findUnique as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(service.cancelOrder(orderId)).rejects.toThrow(NotFoundException);
    });

    it('should successfully cancel order and return the result from restoreOrderStock', async () => {
      // Arrange
      const mockOrder = { id: orderId, status: OrderStatus.PAID, items: [{ productId: 'prod-1', quantity: 2 }] };
      const mockUpdatedOrder = { ...mockOrder, status: OrderStatus.CANCELLED };

      (prisma.order.findUnique as jest.Mock).mockResolvedValue(mockOrder);
      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => await callback(prisma));
      (prisma.product.update as jest.Mock).mockResolvedValue({});
      (prisma.order.update as jest.Mock).mockResolvedValue(mockUpdatedOrder);

      // Act
      const result = await service.cancelOrder(orderId);

      // Assert
      expect(prisma.order.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: orderId },
        data: { status: OrderStatus.CANCELLED },
      }));
      expect(result).toEqual(mockUpdatedOrder);
    });
  });

  describe('restoreOrderStock', () => {
    const orderId = 'order-123';

    it('should throw NotFoundException if order is not found', async () => {
      // Arrange
      (prisma.order.findUnique as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(service.restoreOrderStock(orderId)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if order status is not cancellable', async () => {
      // Arrange
      (prisma.order.findUnique as jest.Mock).mockResolvedValue({ status: OrderStatus.SHIPPED });

      // Act & Assert
      await expect(service.restoreOrderStock(orderId)).rejects.toThrow(BadRequestException);
      await expect(service.restoreOrderStock(orderId)).rejects.toThrow('Cannot cancel/restore stock for order with status: SHIPPED');
    });

    it('should successfully restore stock and update order status', async () => {
      // Arrange
      const mockOrder = {
        id: orderId,
        status: OrderStatus.PAID,
        items: [{ productId: 'prod-1', quantity: 2 }],
        promoCodeSnapshot: JSON.stringify({ id: 'promo-1' }),
      };
      const mockUpdatedOrder = { ...mockOrder, status: OrderStatus.CANCELLED };

      (prisma.order.findUnique as jest.Mock).mockResolvedValue(mockOrder);
      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => await callback(prisma));
      (prisma.product.update as jest.Mock).mockResolvedValue({});
      (prisma.promoCode.update as jest.Mock).mockResolvedValue({});
      (prisma.order.update as jest.Mock).mockResolvedValue(mockUpdatedOrder);

      // Act
      const result = await service.restoreOrderStock(orderId);

      // Assert
      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: 'prod-1' },
        data: { stock: { increment: 2 } },
      });
      expect(prisma.promoCode.update).toHaveBeenCalledWith({
        where: { id: 'promo-1' },
        data: { usageCount: { decrement: 1 } },
      });
      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: orderId },
        data: { status: OrderStatus.CANCELLED },
      });
      expect(result).toEqual(mockUpdatedOrder);
    });
  });

  describe('deliverOrder', () => {
    const orderId = 'order-123';
    const deliveryUserId = 'delivery-user-123';

    it('should successfully update order status to DELIVERED', async () => {
      // Arrange
      const mockOrder = { id: orderId, status: OrderStatus.SHIPPED, deliveryUserId };
      (prisma.order.findUnique as jest.Mock).mockResolvedValue(mockOrder);
      (prisma.order.update as jest.Mock).mockResolvedValue({ ...mockOrder, status: OrderStatus.DELIVERED });

      // Act
      const result = await service.deliverOrder(deliveryUserId, orderId);

      // Assert
      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: orderId, deliveryUserId },
        data: { status: OrderStatus.DELIVERED },
      });
      expect(result.status).toBe(OrderStatus.DELIVERED);
    });

    it('should throw BadRequestException if order is not in SHIPPED status', async () => {
      // Arrange
      (prisma.order.findUnique as jest.Mock).mockResolvedValue({ status: OrderStatus.PROCESSING });

      // Act & Assert
      await expect(service.deliverOrder(deliveryUserId, orderId)).rejects.toThrow(BadRequestException);
    });
  });
});
