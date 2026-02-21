export interface PaymentProvider {
    createPaymentIntent(input: {
        orderId: string;
        amount: number;
        currency: string;
    }): Promise<{ paymentIntentId: string, clientSecret: string }>;

    createPaymentLink(input: {
        priceId: string;
        quantity: number;
        metadata?: Record<string, string>;
        customerEmail: string;
    }): Promise<{ sessionUrl: string, sessionId: string }>;

    createProduct(input: {
        name: string
        description?: string
    }): Promise<{ id: string }>

    updateProduct(input: {
        productId: string
        name: string
        description?: string
    }): Promise<{ id: string }>

    createPrice(input: {
        productId: string
        unitAmount: number
        currency: string
    }): Promise<{ id: string }>

    archiveProduct(productId: string): Promise<{ id: string }>
    archivePrice(priceId: string): Promise<{ id: string }>

    refund(paymentIntentId: string): Promise<void>;

    constructWebhookEvent(
        payload: Buffer,
        signature: string,
    ): unknown;
}