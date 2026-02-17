import { Module } from '@nestjs/common';
import { ProductsResolver } from './products.resolver';
import { ProductsService } from './products.service';
import { ProductLikesModule } from 'src/product-likes/product-likes.module';

@Module({
  imports: [ProductLikesModule],
  providers: [ProductsResolver, ProductsService],
  exports: [ProductsResolver]
})
export class ProductsModule {}
