import { forwardRef, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { StripeProvider } from './providers/stripe/stripe.provider';
import { PaymentProvider } from './domain/payment-provider.interface';
import { PaymentStatus } from './enums/payment-status.enum';
import { CreatePaymentLinkDto } from './dtos/create-payment-link.dto';
import { OrdersService } from 'src/orders/orders.service';
import { OrderStatus } from '../orders/enums/order-status.enum';
import { ProductLikesService } from 'src/product-likes/products-likes.service';
import { Decimal } from '@prisma/client/runtime/client';
import { CartStatus } from '@prisma/client';


@Injectable()
export class PaymentsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly stripeProvider: StripeProvider,
        @Inject(forwardRef(() => OrdersService))
        private readonly ordersService: OrdersService,
        private readonly productLikesService: ProductLikesService,
    ) { }

    private provider(): PaymentProvider {
        return this.stripeProvider;
    }

    async createPaymentIntent(userId: string, orderId: string, total: Decimal) {
        const provider = this.provider();

        const amountInCents = Math.round(total.toNumber() * 100);
        const result = await provider.createPaymentIntent({
            orderId,
            amount: amountInCents,
            currency: 'usd',
        });

        await this.prisma.payment.create({
            data: {
                orderId,
                userId,
                externalPaymentId: result.paymentIntentId,
                amount: total,
                provider: 'stripe',
                status: PaymentStatus.PENDING,
                metadata: {
                    userId,
                    clientSecret: result.clientSecret,
                },
            },
        });

        return result;
    }

    async createPaymentLink(email: string, orderId: string, stripePriceId: string, quantity: number, userId?: string) {

        const provider = this.provider();
        const paymentLink = await provider.createPaymentLink({
            priceId: stripePriceId,
            quantity: quantity,
            customerEmail: email,
            metadata: {
                orderId: orderId,
                sellableProductId: stripePriceId,
            },
        });

        await this.prisma.payment.create({
            data: {
                orderId,
                userId,
                externalPaymentId: paymentLink.sessionId,
                amount: new Decimal(paymentLink.amount!).dividedBy(100).toDecimalPlaces(2),
                provider: 'stripe',
                status: PaymentStatus.PENDING,
                metadata: {
                    userId,
                    sessionUrl: paymentLink.sessionUrl,
                },
            },
        });

        return paymentLink
    }

    async findByOrderIds(orderIds: string[]) {
        return this.prisma.payment.findMany({
            where: {
                orderId: { in: orderIds },
            },
        });
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

    private async handleWebhookCases(event: any) {
        switch (event.type) {
            case 'payment_intent.succeeded':
                await this.paymentSucceeded(event);
                break;

            case 'payment_intent.payment_failed':
                await this.paymentIntentFailed(event);
                break;

            case 'payment_intent.canceled':
                await this.paymentIntentCanceled(event);
                break;

            case 'checkout.session.completed':
                await this.paymentSessionSucceeded(event);
                break;

            case 'checkout.session.expired':
                await this.paymentSessionFailed(event);
                break;

        }
    }

    private async paymentSucceeded(event: any) {
        const metadata = event.data.object.metadata
        if (metadata.orderId === undefined) {
            return;
        }
        const order = await this.prisma.order.update({
            where: { id: metadata.orderId },
            data: { status: OrderStatus.PAID },
        });

        await this.prisma.payment.updateMany({
            where: { orderId: metadata.orderId, status: PaymentStatus.PENDING },
            data: { status: PaymentStatus.SUCCEEDED },
        });

        if (order.userId) {
            await this.prisma.cart.updateMany({
                where: { status: CartStatus.ACTIVE, userId: order.userId },
                data: { status: CartStatus.ORDERED },
            });
        }

        await this.productLikesService.notifyLowStockToInterestedUsers(order.id)
    }

    private async paymentSessionSucceeded(event: any) {
        const metadata = event.data.object.metadata

        if (!metadata || !metadata.orderId) {
            console.error("Metadata has no orderId");
            return;
        }

        const order = await this.prisma.order.update({
            where: { id: metadata!.orderId },
            data: { status: OrderStatus.PAID },
        });

        await this.prisma.payment.updateMany({
            where: { orderId: metadata!.orderId, status: PaymentStatus.PENDING },
            data: { status: PaymentStatus.SUCCEEDED },
        });

        await this.productLikesService.notifyLowStockToInterestedUsers(order.id)
    }

    private async paymentIntentFailed(event: any) {
        // Just log for now; cancellation happens via .canceled or session expiry.
        console.log('Payment intent failed, awaiting definitive cancellation or retry:', event.id);
    }

    private async paymentIntentCanceled(event: any) {
        const metadata = this.stripeProvider.getMetadata(event);
        if (metadata.orderId) {
            await this.ordersService.restoreOrderStock(metadata.orderId);
        }
    }

    private async paymentSessionFailed(event: any) {
        const metadata = this.stripeProvider.getMetadata(event);
        if (metadata.orderId) {
            await this.ordersService.restoreOrderStock(metadata.orderId);
        }
    }
}