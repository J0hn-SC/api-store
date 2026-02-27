import { forwardRef, Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { StripeProvider } from './providers/stripe/stripe.provider';
import { OrdersModule } from 'src/orders/orders.module';
import { ProductLikesModule } from 'src/product-likes/product-likes.module';
import { PaymentsLoader } from './payments-loader.service';

@Module({
  imports: [forwardRef(() => OrdersModule), ProductLikesModule],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    StripeProvider,
    PaymentsLoader
  ],
  exports: [PaymentsService, PaymentsLoader],
})
export class PaymentsModule { }
