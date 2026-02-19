import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CartsService } from 'src/carts/carts.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { PromoCodesService } from 'src/promo-codes/promo-codes.service';
import { CreateOrderInput } from './input/create-order.input';
import { Decimal } from '@prisma/client/runtime/client';
import { OrderStatus, PromoCode} from '@prisma/client';
import { DiscountType } from 'src/promo-codes/enums/discount-type.enum';
import { OrderFilterInput } from './input/order-filter.input';

@Injectable()
export class OrdersService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly cartsService: CartsService,
        private readonly promoService: PromoCodesService,
    ) {}

    private validateAddressInput(input: CreateOrderInput) {
        if (!input.addressId && !input.newAddress) {
            throw new BadRequestException('Shipping address is required');
        }
        if (input.addressId && input.newAddress) {
            throw new ConflictException('Provide either an addressId or a newAddress, not both');
        }
    }

    private async resolveAddress(userId: string, input: CreateOrderInput) {
        if (input.addressId) {
            const addr = await this.prisma.address.findFirst({
                where: { id: input.addressId, userId }
            });
            if (!addr) throw new NotFoundException('Address not found');
            return addr;
        }
        const { name, ...addressWithoutName } = input.newAddress!;
        return await this.prisma.address.create({
            data: { ...addressWithoutName, userId }
        });
    }

    private async resolvePromoCode(inputCode?: string, cartPromoId?: string | null) {
        if (inputCode) return await this.promoService.validatePromoCode(inputCode);
        if (cartPromoId) return await this.promoService.findById(cartPromoId);
        return null;
    }

    private calculateDiscount(subtotal: Decimal, promo?: PromoCode | null): Decimal {
        if (!promo) return new Decimal(0);

        return promo.discountType === DiscountType.PERCENTAGE
            ? subtotal.times(promo.discountValue)
            : Decimal.min(subtotal, promo.discountValue);
    }


    async createFromCart(userId: string, input: CreateOrderInput) {
        this.validateAddressInput(input);

        const cart = await this.cartsService.getActiveCart(userId);
        if (!cart || cart.items.length === 0) {
            throw new BadRequestException('Cart is empty or not found');
        }

        const address = await this.resolveAddress(userId, input);

        const subtotal = cart.items.reduce(
            (acc, item) => item.product.price.times(item.quantity).plus(acc), 
            new Decimal(0)
        );
        
        const promoCode = await this.resolvePromoCode(input.code, cart.promoCodeId);
        const discount = this.calculateDiscount(subtotal, promoCode);
        const total = Decimal.max(0, subtotal.minus(discount));

        return await this.prisma.$transaction(async (tx) => {
            const order = await tx.order.create({
                data: {
                    userId,
                    status: OrderStatus.PENDING,
                    subtotal,
                    discount,
                    total,
                    tax: 0,
                    promoCodeSnapshot: JSON.stringify(promoCode),
                    shippingAddressSnapshot: JSON.stringify(address),
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

            await this.cartsService.markAsOrdered(cart.id); 

            return order;
        });
    }

    async findOrders(userId: string | undefined, filter?: OrderFilterInput) {
        return this.prisma.order.findMany({
            where: {
                userId,
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
            include: { items: true },
        });
    }

    async processOrder(orderId: string) {
        return this.prisma.order.update({
            where: { id: orderId },
            data: { status: OrderStatus.PROCESSING },
        });
    }

    async shipOrder(orderId: string) {
        return this.prisma.order.update({
            where: { id: orderId },
            data: { status: OrderStatus.SHIPPED },
        });
    }

    async cancelOrder(orderId: string) {
        return this.prisma.order.update({
            where: { id: orderId },
            data: { status: OrderStatus.CANCELLED },
        });
    }

    async deliverOrder(userId: string, orderId: string) {
        return this.prisma.order.update({
            where: { id: orderId },
            data: {
                status: OrderStatus.DELIVERED,
                deliveryUserId: userId
            },
        });
    }
}