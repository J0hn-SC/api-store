import { Module } from '@nestjs/common';
import { ProductsResolver } from './products.resolver';
import { ProductsService } from './products.service';
import { ProductLikesModule } from 'src/product-likes/product-likes.module';
import { PaymentsModule } from 'src/payments/payments.module';

@Module({
  imports: [ProductLikesModule, PaymentsModule],
  providers: [ProductsResolver, ProductsService],
  exports: [ProductsResolver]
})
export class ProductsModule {}
