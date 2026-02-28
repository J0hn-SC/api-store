import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsService } from './payments.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { StripeProvider } from './providers/stripe/stripe.provider';
import { OrdersService } from 'src/orders/orders.service';
import { ProductLikesService } from 'src/product-likes/products-likes.service';
import { PaymentStatus } from './enums/payment-status.enum';
import { Decimal } from '@prisma/client/runtime/client';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let prisma: PrismaService;
  let stripeProvider: StripeProvider;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        {
          provide: PrismaService,
          useValue: {
            payment: {
              create: jest.fn(),
              findMany: jest.fn(),
              updateMany: jest.fn(),
            },
            order: {
              update: jest.fn(),
            },
            cart: {
              updateMany: jest.fn(),
            },
          },
        },
        {
          provide: StripeProvider,
          useValue: {
            createPaymentIntent: jest.fn(),
            createPaymentLink: jest.fn(),
            createProduct: jest.fn(),
            createPrice: jest.fn(),
            updateProduct: jest.fn(),
            archivePrice: jest.fn(),
            archiveProduct: jest.fn(),
            constructWebhookEvent: jest.fn(),
            getMetadata: jest.fn(),
          },
        },
        {
          provide: OrdersService,
          useValue: {
            restoreOrderStock: jest.fn(),
          },
        },
        {
          provide: ProductLikesService,
          useValue: {
            notifyLowStockToInterestedUsers: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    prisma = module.get<PrismaService>(PrismaService);
    stripeProvider = module.get<StripeProvider>(StripeProvider);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createPaymentIntent', () => {
    const userId = 'user-123';
    const orderId = 'order-123';
    const total = new Decimal(100.5);

    it('should successfully create a payment intent and record it in the database', async () => {
      // Arrange
      const stripeResult = {
        paymentIntentId: 'pi_123',
        clientSecret: 'secret_123',
      };
      (stripeProvider.createPaymentIntent as jest.Mock).mockResolvedValue(stripeResult);

      // Act
      const result = await service.createPaymentIntent(userId, orderId, total);

      // Assert
      expect(stripeProvider.createPaymentIntent).toHaveBeenCalledWith({
        orderId,
        amount: 10050, // 100.5 * 100
        currency: 'usd',
      });

      expect(prisma.payment.create).toHaveBeenCalledWith({
        data: {
          orderId,
          userId,
          externalPaymentId: stripeResult.paymentIntentId,
          amount: total,
          provider: 'stripe',
          status: PaymentStatus.PENDING,
          metadata: {
            userId,
            clientSecret: stripeResult.clientSecret,
          },
        },
      });

      expect(result).toEqual(stripeResult);
    });
  });

  describe('createPaymentLink', () => {
    const email = 'guest@example.com';
    const orderId = 'order-123';
    const stripePriceId = 'price_123';
    const quantity = 2;
    const userId = 'user-123';

    it('should successfully create a payment link and record it in the database', async () => {
      // Arrange
      const stripeResult = {
        sessionId: 'sess_123',
        sessionUrl: 'https://checkout.stripe.com/pay/sess_123',
        amount: 2000, // 20.00 in cents
      };
      (stripeProvider.createPaymentLink as jest.Mock).mockResolvedValue(stripeResult);

      // Act
      const result = await service.createPaymentLink(email, orderId, stripePriceId, quantity, userId);

      // Assert
      expect(stripeProvider.createPaymentLink).toHaveBeenCalledWith({
        priceId: stripePriceId,
        quantity,
        customerEmail: email,
        metadata: {
          orderId,
          sellableProductId: stripePriceId,
        },
      });

      expect(prisma.payment.create).toHaveBeenCalledWith({
        data: {
          orderId,
          userId,
          externalPaymentId: stripeResult.sessionId,
          amount: new Decimal(20), // 2000 / 100
          provider: 'stripe',
          status: PaymentStatus.PENDING,
          metadata: {
            userId,
            sessionUrl: stripeResult.sessionUrl,
          },
        },
      });

      expect(result).toEqual(stripeResult);
    });

    it('should work without userId', async () => {
      // Arrange
      const stripeResult = {
        sessionId: 'sess_123',
        sessionUrl: 'https://checkout.stripe.com/pay/sess_123',
        amount: 1000,
      };
      (stripeProvider.createPaymentLink as jest.Mock).mockResolvedValue(stripeResult);

      // Act
      await service.createPaymentLink(email, orderId, stripePriceId, 1);

      // Assert
      expect(prisma.payment.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          userId: undefined,
        }),
      }));
    });
  });

  describe('createSellableProduct', () => {
    const input = {
      name: 'Test Product',
      description: 'Test Description',
      price: 1000,
      currency: 'usd',
    };

    it('should successfully create a product and a price in Stripe', async () => {
      // Arrange
      (stripeProvider.createProduct as jest.Mock).mockResolvedValue({ id: 'prod_123' });
      (stripeProvider.createPrice as jest.Mock).mockResolvedValue({ id: 'price_123' });

      // Act
      const result = await service.createSellableProduct(input);

      // Assert
      expect(stripeProvider.createProduct).toHaveBeenCalledWith({
        name: input.name,
        description: input.description,
      });
      expect(stripeProvider.createPrice).toHaveBeenCalledWith({
        productId: 'prod_123',
        unitAmount: input.price,
        currency: input.currency,
      });
      expect(result).toEqual({
        productId: 'prod_123',
        priceId: 'price_123',
      });
    });
  });

  describe('updateSellableProduct', () => {
    const baseInput = {
      name: 'Updated Product',
      description: 'Updated Description',
      price: 2000,
      currency: 'usd',
    };

    it('should update the existing product name and create a new price when productId is provided', async () => {
      // Arrange
      const input = { ...baseInput, productId: 'prod_existing' };
      (stripeProvider.updateProduct as jest.Mock).mockResolvedValue({ id: 'prod_existing' });
      (stripeProvider.createPrice as jest.Mock).mockResolvedValue({ id: 'price_new' });

      // Act
      const result = await service.updateSellableProduct(input);

      // Assert
      expect(stripeProvider.createProduct).not.toHaveBeenCalled();
      expect(stripeProvider.updateProduct).toHaveBeenCalledWith({
        productId: 'prod_existing',
        name: input.name,
      });
      expect(stripeProvider.createPrice).toHaveBeenCalledWith({
        productId: 'prod_existing',
        unitAmount: input.price,
        currency: input.currency,
      });
      expect(result).toEqual({ productId: 'prod_existing', priceId: 'price_new' });
    });

    it('should create a new product and price when productId is not provided', async () => {
      // Arrange
      (stripeProvider.createProduct as jest.Mock).mockResolvedValue({ id: 'prod_new' });
      (stripeProvider.createPrice as jest.Mock).mockResolvedValue({ id: 'price_new' });

      // Act
      const result = await service.updateSellableProduct(baseInput);

      // Assert
      expect(stripeProvider.updateProduct).not.toHaveBeenCalled();
      expect(stripeProvider.createProduct).toHaveBeenCalledWith({
        name: baseInput.name,
        description: baseInput.description,
      });
      expect(stripeProvider.createPrice).toHaveBeenCalledWith({
        productId: 'prod_new',
        unitAmount: baseInput.price,
        currency: baseInput.currency,
      });
      expect(result).toEqual({ productId: 'prod_new', priceId: 'price_new' });
    });
  });

  describe('disabledSellableProduct', () => {
    const input = { productId: 'prod_123', priceId: 'price_123' };

    it('should archive the price and product in Stripe and return their ids', async () => {
      // Arrange
      (stripeProvider.archivePrice as jest.Mock).mockResolvedValue({ id: input.priceId });
      (stripeProvider.archiveProduct as jest.Mock).mockResolvedValue({ id: input.productId });

      // Act
      const result = await service.disabledSellableProduct(input);

      // Assert
      expect(stripeProvider.archivePrice).toHaveBeenCalledWith(input.priceId);
      expect(stripeProvider.archiveProduct).toHaveBeenCalledWith(input.productId);
      expect(result).toEqual({ productId: input.productId, priceId: input.priceId });
    });
  });

  describe('paymentSucceeded', () => {
    const orderId = 'order-123';
    const userId = 'user-123';

    const makeEvent = (metadata: Record<string, any>) => ({
      data: { object: { metadata } },
    });

    it('should do nothing if metadata.orderId is undefined', async () => {
      // Arrange
      const event = makeEvent({});

      // Act
      await (service as any).paymentSucceeded(event);

      // Assert
      expect(prisma.order.update).not.toHaveBeenCalled();
      expect(prisma.payment.updateMany).not.toHaveBeenCalled();
    });

    it('should update order to PAID, payments to SUCCEEDED, cart to ORDERED, and notify low stock', async () => {
      // Arrange
      const event = makeEvent({ orderId });
      (prisma.order.update as jest.Mock).mockResolvedValue({ id: orderId, userId });
      (prisma.payment.updateMany as jest.Mock).mockResolvedValue({});
      (prisma.cart.updateMany as jest.Mock).mockResolvedValue({});
      const productLikesService = (service as any).productLikesService;

      // Act
      await (service as any).paymentSucceeded(event);

      // Assert
      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: orderId },
        data: { status: 'PAID' },
      });
      expect(prisma.payment.updateMany).toHaveBeenCalledWith({
        where: { orderId, status: 'PENDING' },
        data: { status: 'SUCCEEDED' },
      });
      expect(prisma.cart.updateMany).toHaveBeenCalledWith({
        where: { status: 'ACTIVE', userId },
        data: { status: 'ORDERED' },
      });
      expect(productLikesService.notifyLowStockToInterestedUsers).toHaveBeenCalledWith(orderId);
    });

    it('should skip cart update when order has no userId', async () => {
      // Arrange
      const event = makeEvent({ orderId });
      (prisma.order.update as jest.Mock).mockResolvedValue({ id: orderId, userId: null });
      (prisma.payment.updateMany as jest.Mock).mockResolvedValue({});

      // Act
      await (service as any).paymentSucceeded(event);

      // Assert
      expect(prisma.cart.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('paymentSessionSucceeded', () => {
    const orderId = 'order-123';

    const makeEvent = (metadata: Record<string, any> | null) => ({
      data: { object: { metadata } },
    });

    it('should do nothing if metadata or orderId is missing', async () => {
      // Arrange
      const event = makeEvent(null);

      // Act
      await (service as any).paymentSessionSucceeded(event);

      // Assert
      expect(prisma.order.update).not.toHaveBeenCalled();
    });

    it('should update order to PAID, payments to SUCCEEDED, and notify low stock', async () => {
      // Arrange
      const event = makeEvent({ orderId });
      (prisma.order.update as jest.Mock).mockResolvedValue({ id: orderId });
      (prisma.payment.updateMany as jest.Mock).mockResolvedValue({});
      const productLikesService = (service as any).productLikesService;

      // Act
      await (service as any).paymentSessionSucceeded(event);

      // Assert
      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: orderId },
        data: { status: 'PAID' },
      });
      expect(prisma.payment.updateMany).toHaveBeenCalledWith({
        where: { orderId, status: 'PENDING' },
        data: { status: 'SUCCEEDED' },
      });
      expect(productLikesService.notifyLowStockToInterestedUsers).toHaveBeenCalledWith(orderId);
    });
  });

  describe('paymentIntentCanceled', () => {
    const orderId = 'order-123';

    it('should call restoreOrderStock if metadata has orderId', async () => {
      // Arrange
      (stripeProvider.getMetadata as jest.Mock).mockReturnValue({ orderId });
      const ordersService = (service as any).ordersService;

      // Act
      await (service as any).paymentIntentCanceled({ data: { object: {} } });

      // Assert
      expect(ordersService.restoreOrderStock).toHaveBeenCalledWith(orderId);
    });

    it('should do nothing if metadata has no orderId', async () => {
      // Arrange
      (stripeProvider.getMetadata as jest.Mock).mockReturnValue({});
      const ordersService = (service as any).ordersService;

      // Act
      await (service as any).paymentIntentCanceled({ data: { object: {} } });

      // Assert
      expect(ordersService.restoreOrderStock).not.toHaveBeenCalled();
    });
  });

  describe('paymentSessionFailed', () => {
    const orderId = 'order-123';

    it('should call restoreOrderStock if metadata has orderId', async () => {
      // Arrange
      (stripeProvider.getMetadata as jest.Mock).mockReturnValue({ orderId });
      const ordersService = (service as any).ordersService;

      // Act
      await (service as any).paymentSessionFailed({ data: { object: {} } });

      // Assert
      expect(ordersService.restoreOrderStock).toHaveBeenCalledWith(orderId);
    });

    it('should do nothing if metadata has no orderId', async () => {
      // Arrange
      (stripeProvider.getMetadata as jest.Mock).mockReturnValue({});
      const ordersService = (service as any).ordersService;

      // Act
      await (service as any).paymentSessionFailed({ data: { object: {} } });

      // Assert
      expect(ordersService.restoreOrderStock).not.toHaveBeenCalled();
    });
  });
});
