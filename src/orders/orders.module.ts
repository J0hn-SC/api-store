import { forwardRef, Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersResolver } from './orders.resolver';
import { CartsModule } from 'src/carts/carts.module';
import { PromoCodesModule } from 'src/promo-codes/promo-codes.module';
import { PaymentsModule } from 'src/payments/payments.module';
import { OrdersLoader } from './orders-loader.service';

@Module({
  imports: [CartsModule, PromoCodesModule, forwardRef(() => PaymentsModule)],
  providers: [OrdersService, OrdersResolver, OrdersLoader],
  exports: [OrdersService]
})
export class OrdersModule {}
