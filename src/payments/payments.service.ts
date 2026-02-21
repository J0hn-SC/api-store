import { forwardRef, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { StripeProvider } from './providers/stripe/stripe.provider';
import { PaymentProvider } from './domain/payment-provider.interface';
import { PaymentStatus } from './enums/payment-status.enum';
import { CreatePaymentLinkDto } from './dtos/create-payment-link.dto';
import { OrdersService } from 'src/orders/orders.service';
import { OrderStatus } from '../orders/enums/order-status.enum';
import { ProductLikesService } from 'src/product-likes/products-likes.service';


@Injectable()
export class PaymentsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly stripeProvider: StripeProvider,
        @Inject(forwardRef(() => OrdersService))
        private readonly ordersService: OrdersService,
        @Inject(forwardRef(() => OrdersService))
        private readonly productLikesService: ProductLikesService,
    ) {}

    private provider(): PaymentProvider {
        return this.stripeProvider;
    }

    async createPaymentIntent(userId: string, orderId: string) {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
        });

        if (!order) throw new NotFoundException('Order not found');

        const provider = this.provider();

        const amountInCents = Math.round(order.total.toNumber() * 100);
        const result = await provider.createPaymentIntent({
            orderId,
            amount: amountInCents,
            currency: 'usd',
        });

        await this.prisma.payment.create({
            data: {
                orderId,
                userId,
                transactionId: result.clientSecret,
                amount: order.total,
                provider: 'stripe',
                status: PaymentStatus.PENDING,
            },
        });

        return result;
    }

    async createPaymentLink(userId: string, paymentLinkDto: CreatePaymentLinkDto ) {
        const product = await this.prisma.product.findUnique({
            where: { id: paymentLinkDto.productId },
        });

        if (!product) throw new NotFoundException('Product not found');

        const provider = this.provider();

        const order = await this.ordersService.createSingleProductOrder(product, paymentLinkDto.quantity, JSON.stringify(paymentLinkDto.shippingAddress), userId)

        const pl = await provider.createPaymentLink({
            priceId: product.stripePriceId,
            quantity: paymentLinkDto.quantity,
            customerEmail: paymentLinkDto.email,
            metadata: { 
                orderId: order.id,
                productId: paymentLinkDto.productId, 
                quantity: paymentLinkDto.quantity.toString(),
            },
        });

        await this.ordersService.attachSessionIdToOrder(order.id, pl.sessionId)

        return pl
    }

    async createSellableProduct(input: {
        name: string
        description?: string
        price: number
        currency: string
    }) {
        const provider = this.provider();
        const product = await provider.createProduct({
            name: input.name,
            description: input.description,
        })

        const price = await provider.createPrice({
            productId: product.id,
            unitAmount: input.price,
            currency: input.currency,
        })

        return {
            productId: product.id,
            priceId: price.id,
        }
    }

    async updateSellableProduct(input: {
        productId?: string;
        name: string;
        description: string | null;
        price: number;
        currency: string;
    }) {
        const provider = this.provider();
        let productId = input.productId;

        if (!productId) {
            const product = await provider.createProduct({
                name: input.name,
                description: input.description ? input.description : undefined,
            });
            productId = product.id;
        } else if (input.name) {
            await provider.updateProduct({ productId, name: input.name });
        }

        const price = await provider.createPrice({
            productId: productId,
            unitAmount: input.price,
            currency: input.currency,
        });

        return { productId, priceId: price.id };
    }

    async disabledSellableProduct(input: {
        productId: string
        priceId: string
    }) {
        const provider = this.provider();

        const price = await provider.archivePrice(input.priceId);
        const product = await provider.archiveProduct(input.productId);

        return { productId: product.id, priceId: price.id };
    }

    async handleWebhook(req: Request) {
        const signature = req.headers['stripe-signature'];
        const event = this.stripeProvider.constructWebhookEvent(
            req['rawBody'],
            // req.body,
            signature,
        )

        await this.handleWebhookCases(event as any);
        return { received: true };
    }

    private async handleWebhookCases(event : any) {
        switch (event.type) {
        case 'payment_intent.succeeded':
            await this.paymentSucceeded(event);
            break;

        case 'payment_intent.payment_failed':
            await this.paymentIntentFailed(event);
            break;

        case 'checkout.session.completed':
            await this.paymentSucceeded(event);
            break;

        case 'checkout.session.expired':
            await this.paymentSessionFailed(event);
            break;

        }
    }

    private async paymentSucceeded(event: any) {
        const metadata = this.stripeProvider.getMetadata(event)

        const order = await this.prisma.order.update({
            where: { id: metadata.orderId },
            data: { status: OrderStatus.PAID },
        });

        await this.productLikesService.notifyLowStockToInterestedUsers(order.id)
    }

    private async paymentIntentFailed(event: any) {
        const metadata = this.stripeProvider.getMetadata(event)

        await this.prisma.order.update({
            where: { id: metadata.orderId },
            data: { status: OrderStatus.PENDING },
        });
    }

    private async paymentSessionFailed(event: any) {
        const metadata = this.stripeProvider.getMetadata(event)

        await this.prisma.order.update({
            where: { id: metadata.orderId },
            data: { status: OrderStatus.CANCELLED },
        });
    }
}