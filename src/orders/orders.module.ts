import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersResolver } from './orders.resolver';
import { CartsModule } from 'src/carts/carts.module';
import { PromoCodesModule } from 'src/promo-codes/promo-codes.module';
import { OrdersLoader } from './orders-loader.service';

@Module({
  imports: [CartsModule, PromoCodesModule],
  providers: [OrdersService, OrdersResolver, OrdersLoader]
})
export class OrdersModule {}
