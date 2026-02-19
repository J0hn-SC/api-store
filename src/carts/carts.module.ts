import { Module } from '@nestjs/common';
import { CartsService } from './carts.service';
import { CartsResolver } from './carts.resolver';
import { PromoCodesModule } from 'src/promo-codes/promo-codes.module';
import { CartItemsLoaderService } from './cart-items-loader.service';

@Module({
  imports: [PromoCodesModule],
  providers: [CartsService, CartsResolver, CartItemsLoaderService]
})
export class CartsModule {}
