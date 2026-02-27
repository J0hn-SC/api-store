import { Injectable, InternalServerErrorException } from "@nestjs/common";
import Stripe from "stripe";
import { PaymentProvider } from '../../domain/payment-provider.interface';
import { ConfigService } from "@nestjs/config";



@Injectable()
export class StripeProvider implements PaymentProvider {
    private readonly stripe: Stripe;

    constructor(private readonly config: ConfigService) {
        this.stripe = new Stripe(this.config.get('STRIPE_SECRET_KEY')!);
    }

    async createPaymentIntent({ orderId, amount, currency }) {
        const intent = await this.stripe.paymentIntents.create({
            amount: Math.round(amount * 100),
            currency,
            metadata: { orderId },
            automatic_payment_methods: {
                enabled: true,
                allow_redirects: 'never',
            },
        });

        if (!intent.client_secret) {
            throw new InternalServerErrorException('Internal Server Error');
        }

        return { paymentIntentId: intent.id, clientSecret: intent.client_secret };
    }

    async createPaymentLink({ priceId, quantity, metadata, customerEmail }) {
        const session = await this.stripe.checkout.sessions.create({
            mode: 'payment',

            customer_email: customerEmail,

            // shipping_address_collection: {
            //     allowed_countries: ['US', 'MX', 'ES'],
            // },

            line_items: [
                {
                    price: priceId,
                    quantity,
                },
            ],
            expires_at: Math.floor(Date.now() / 1000) + (30 * 60), //30 min

            metadata: {
                ...metadata,
                order_type: 'single_product_purchase',
            },


            success_url:
                'https://example.com/success?session_id={CHECKOUT_SESSION_ID}',
            cancel_url: 'https://example.com/cancel',
        });

        if (!session.url) {
            throw new InternalServerErrorException(
                'Stripe could not generate a checkout URL',
            );
        }

        return {
            sessionUrl: session.url,
            sessionId: session.id,
            amount: session.amount_total,
        };
    }

    async createProduct({ name, description }) {
        const product = await this.stripe.products.create({
            name,
            description,
        })
        return { id: product.id }
    }

    async createPrice({ productId, unitAmount, currency }) {
        const price = await this.stripe.prices.create({
            product: productId,
            unit_amount: unitAmount,
            currency,
        })
        return { id: price.id }
    }

    async updateProduct({ productId, name, description }) {
        const product = await this.stripe.products.update(productId, {
            name,
            description,
        })
        return { id: product.id }
    }

    async archivePrice(priceId: string) {
        const price = await this.stripe.prices.update(priceId, {
            active: false,
        })
        return { id: price.id }
    }

    async archiveProduct(productId: string) {
        const product = await this.stripe.products.update(productId, {
            active: false,
        })
        return { id: product.id }
    }

    async refund(paymentIntentId: string) {
        await this.stripe.refunds.create({
            payment_intent: paymentIntentId,
        });
    }

    constructWebhookEvent(payload: Buffer, signature: string) {
        return this.stripe.webhooks.constructEvent(
            payload,
            signature,
            this.config.get('STRIPE_WEBHOOK_SECRET')!,
        );
    }

    getMetadata(event: Stripe.Event) {
        const intent = event.data.object as Stripe.PaymentIntent;
        const metadata = intent.metadata
        return metadata
    }

    getSessionMetadata(event: Stripe.Event) {
        const session = event.data.object as Stripe.Checkout.Session;
        const metadata = session.metadata
        console.log("metadata", metadata)
        return metadata
    }
}