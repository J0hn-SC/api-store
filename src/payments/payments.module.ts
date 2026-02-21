import { forwardRef, Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { StripeProvider } from './providers/stripe/stripe.provider';
import { OrdersModule } from 'src/orders/orders.module';
import { ProductLikesModule } from 'src/product-likes/product-likes.module';

@Module({
  imports: [forwardRef(() => OrdersModule), ProductLikesModule],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    StripeProvider,
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
