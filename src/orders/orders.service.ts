import { BadRequestException, ConflictException, ForbiddenException, forwardRef, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CartsService } from 'src/carts/carts.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { PromoCodesService } from 'src/promo-codes/promo-codes.service';
import { CreateOrderInput } from './input/create-order.input';
import { Decimal } from '@prisma/client/runtime/client';
import { OrderStatus, PromoCode, Role } from '@prisma/client';
import { DiscountType } from 'src/promo-codes/enums/discount-type.enum';
import { OrderFilterInput } from './input/order-filter.input';
import { PaymentsService } from 'src/payments/payments.service';
import { CreateOrderFromSingleProductInput } from './input/create-order-from-single-product.dto';
import { CreateAddressInput } from './input/create-address.input';
import { PaymentMetadata } from 'src/payments/entities/payment-metadata.interface';
import { Action } from 'rxjs/internal/scheduler/Action';
import { CaslAbilityFactory } from 'src/casl/factories/casl-ability.factory';

@Injectable()
export class OrdersService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly cartsService: CartsService,
        private readonly promoService: PromoCodesService,
        @Inject(forwardRef(() => PaymentsService))
        private readonly paymentsService: PaymentsService,
        private readonly abilityFactory: CaslAbilityFactory,
    ) { }

    private async resolveAddress(userId: string, addressId?: string, address?: CreateAddressInput) {

        if (!addressId && !address) {
            throw new BadRequestException('Shipping address is required');
        }
        if (addressId && address) {
            throw new ConflictException('Provide either an addressId or a address, not both');
        }

        if (addressId) {
            const addr = await this.prisma.address.findFirst({
                where: { id: addressId, userId }
            });
            if (!addr) throw new NotFoundException('Address not found');
            return addr;
        }

        return await this.prisma.address.create({
            data: { ...address!, userId }
        });
    }

    private async resolvePromoCode(amount: Decimal, inputCode?: string, cartPromoId?: string | null) {
        if (inputCode) return await this.promoService.validatePromoCode(inputCode, amount);
        if (cartPromoId) return await this.promoService.validatePromoCode((await this.promoService.findById(cartPromoId)).code, amount);
        return null;
    }

    private calculateDiscount(subtotal: Decimal, promo?: PromoCode | null): Decimal {
        if (!promo) return new Decimal(0);

        return promo.discountType === DiscountType.PERCENTAGE
            ? subtotal.times(promo.discountValue)
            : Decimal.min(subtotal, promo.discountValue);
    }


    async createOrderFromCart(userId: string, input: CreateOrderInput) {

        const existingOrder = await this.prisma.order.findFirst({
            where: { userId, status: OrderStatus.PENDING },
        });

        if (existingOrder) {
            throw new BadRequestException('You have an order in progress');
        }

        const cart = await this.cartsService.getActiveCart(userId);
        if (!cart || cart.items.length === 0) {
            throw new BadRequestException('Cart is empty or not found');
        }

        const address = await this.resolveAddress(userId, input.addressId, input.address);

        const subtotal = cart.items.reduce(
            (acc, item) => item.product.price.times(item.quantity).plus(acc),
            new Decimal(0)
        );

        const promoCode = await this.resolvePromoCode(subtotal, input.code, cart.promoCodeId);
        const discount = this.calculateDiscount(subtotal, promoCode);
        const total = Decimal.max(0, subtotal.minus(discount));
        const order = await this.prisma.$transaction(async (tx) => {

            for (const item of cart.items) {
                const updatedProduct = await tx.product.updateMany({
                    where: {
                        id: item.productId,
                        stock: { gte: item.quantity }
                    },
                    data: {
                        stock: { decrement: item.quantity }
                    }
                });

                if (updatedProduct.count === 0) {
                    throw new Error(`Product ${item.product.name} has no enough stock.`);
                }
            }

            const order = await tx.order.create({
                data: {
                    userId,
                    status: OrderStatus.PENDING,
                    subtotal,
                    discount,
                    total,
                    tax: 0,
                    promoCodeSnapshot: JSON.stringify(promoCode),
                    items: {
                        create: cart.items.map(item => ({
                            productId: item.productId,
                            nameAtPurchase: item.product.name,
                            priceAtPurchase: item.product.price,
                            quantity: item.quantity,
                            tax: 0
                        })),
                    },
                },
                include: { items: true },
            });

            if (promoCode) {
                await tx.promoCode.update({
                    where: { id: promoCode.id },
                    data: { usageCount: { increment: 1 } }
                });
            }

            return order;
        });

        const paymentIntent = await this.paymentsService.createPaymentIntent(userId, order.id, order.total);

        return {
            ...order,
            clientSecret: paymentIntent.clientSecret,
        };
    }

    async createOrderFromSingleProduct(input: CreateOrderFromSingleProductInput, email: string, userId?: string) {

        const product = await this.prisma.product.findUnique({
            where: { id: input.productId },
        });

        if (!product) throw new NotFoundException('Product not found');

        let address;
        if (userId) {
            address = await this.resolveAddress(userId, input.addressId, input.address);
        } else {
            if (!input.address) throw new BadRequestException('Address is required');
            address = input.address
        }

        const subtotal = product.price.times(input.quantity);
        const total = subtotal;
        const order = await this.prisma.$transaction(async (tx) => {

            const updatedProduct = await tx.product.updateMany({
                where: {
                    id: product.id,
                    stock: { gte: input.quantity }
                },
                data: {
                    stock: { decrement: input.quantity }
                }
            });

            if (updatedProduct.count === 0) {
                throw new ConflictException(`Product ${product.name} has no enough stock.`);
            }

            const order = await tx.order.create({
                data: {
                    userId,
                    status: OrderStatus.PENDING,
                    subtotal,
                    discount: 0,
                    total,
                    tax: 0,
                    shippingAddressSnapshot: JSON.stringify(address),
                    items: {
                        create: [{
                            productId: product.id,
                            nameAtPurchase: product.name,
                            priceAtPurchase: product.price,
                            quantity: input.quantity,
                            tax: 0
                        }],
                    },
                },
                include: { items: true },
            });

            return order;
        });

        const paymentIntent = await this.paymentsService.createPaymentLink(email, order.id, product.stripePriceId, input.quantity, userId);

        return {
            ...order,
            sessionUrl: paymentIntent.sessionUrl,
        };
    }

    async attachSessionIdToOrder(orderId: string, sessionId: string) {
        return this.prisma.order.update({
            where: {
                id: orderId,
            },
            data: {
                paymentSessionId: sessionId
            }
        })
    }

    async findById(id: string) {
        const order = await this.prisma.order.findUnique({
            where: {
                id,
            },
        });
        if (!order) throw new NotFoundException('Order not found');
        const payment = await this.prisma.payment.findFirst({
            where: {
                orderId: order.id,
            },
        });
        if (!payment) throw new NotFoundException('Payment not found');
        const metadata = payment?.metadata as PaymentMetadata | null;
        return { ...order, clientSecret: metadata?.secretClient, sessionUrl: metadata?.sessionUrl };
    }

    async findOrders(userId: string | undefined, role: Role, filter?: OrderFilterInput) {
        return this.prisma.order.findMany({
            where: {
                userId: role === Role.CLIENT ? userId : undefined,
                deliveryUserId: role === Role.DELIVERY ? userId : undefined,
                status: filter?.status,
                total: {
                    gte: filter?.minTotal,
                    lte: filter?.maxTotal,
                },
                createdAt: {
                    gte: filter?.fromDate,
                    lte: filter?.toDate,
                },
            },
            take: filter?.take,
            skip: filter?.skip,
            orderBy: { createdAt: 'desc' },
        });
    }

    async findItemsByOrderIds(orderIds: readonly string[]) {
        return this.prisma.orderItem.findMany({
            where: {
                orderId: { in: [...orderIds] },
            },
        });
    }

    private async ensureStatus(orderId: string, allowedStatuses: OrderStatus[]) {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            select: { status: true }
        });

        if (!order) throw new NotFoundException('Order not found');

        if (!allowedStatuses.includes(order.status)) {
            throw new BadRequestException(
                `Invalid status transition. Current status: ${order.status}. Allowed statuses: ${allowedStatuses.join(', ')}`
            );
        }

        return order;
    }

    async processOrder(orderId: string) {
        await this.ensureStatus(orderId, [OrderStatus.PAID]);
        return this.prisma.order.update({
            where: { id: orderId },
            data: { status: OrderStatus.PROCESSING },
        });
    }

    async shipOrder(orderId: string, deliveryUserId: string) {
        await this.ensureStatus(orderId, [OrderStatus.PROCESSING]);
        return this.prisma.order.update({
            where: { id: orderId },
            data: {
                status: OrderStatus.SHIPPED,
                deliveryUserId: deliveryUserId
            },
        });
    }

    async cancelOrder(orderId: string) {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
        });
        if (!order) throw new NotFoundException('Order not found');
        if (order.status === OrderStatus.PAID || order.status === OrderStatus.PROCESSING) {
            // Refund: it indicates to not implement it yet
        }
        return await this.restoreOrderStock(orderId);
    }

    async deliverOrder(userId: string, orderId: string) {
        await this.ensureStatus(orderId, [OrderStatus.SHIPPED]);

        return this.prisma.order.update({
            where: { id: orderId, deliveryUserId: userId },
            data: {
                status: OrderStatus.DELIVERED,
            },
        });
    }

    async findAvailableOrders() {
        return this.prisma.order.findMany({
            where: {
                status: OrderStatus.SHIPPED,
            },
            include: { user: true }
        });
    }

    async findDeliveryHistory(deliveryUserId: string) {
        return this.prisma.order.findMany({
            where: {
                status: OrderStatus.DELIVERED,
                deliveryUserId,
            }
        });
    }

    async restoreOrderStock(orderId: string) {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: { items: true },
        });

        if (!order) throw new NotFoundException('Order not found');

        if (order.status !== OrderStatus.PENDING && order.status !== OrderStatus.PROCESSING && order.status !== OrderStatus.PAID) {
            throw new BadRequestException(`Cannot cancel/restore stock for order with status: ${order.status}`);
        }

        const updatedOrder = await this.prisma.$transaction(async (tx) => {
            for (const item of order.items) {
                await tx.product.update({
                    where: { id: item.productId },
                    data: {
                        stock: { increment: item.quantity },
                    },
                });
            }

            if (order.promoCodeSnapshot) {
                try {
                    const promo = JSON.parse(order.promoCodeSnapshot);
                    if (promo && promo.id) {
                        await tx.promoCode.update({
                            where: { id: promo.id },
                            data: { usageCount: { decrement: 1 } },
                        });
                    }
                } catch (e) {
                    console.error('Failed to parse promoCodeSnapshot for decrement:', e);
                }
            }



            return await tx.order.update({
                where: { id: orderId },
                data: { status: OrderStatus.CANCELLED },
            });
        });

        return updatedOrder
    }
}
