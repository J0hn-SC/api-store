import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersResolver } from './orders.resolver';
import { CartsModule } from 'src/carts/carts.module';
import { PromoCodesModule } from 'src/promo-codes/promo-codes.module';

@Module({
  imports: [CartsModule, PromoCodesModule],
  providers: [OrdersService, OrdersResolver]
})
export class OrdersModule {}
