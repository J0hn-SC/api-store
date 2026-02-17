import { Module } from '@nestjs/common';
import { ProductLikesResolver } from './product-likes.resolver';
import { ProductLikesService } from './products-likes.service';
import { ProductLikesLoaderService } from './product-likes-loader.service';

@Module({
  providers: [ProductLikesResolver, ProductLikesLoaderService, ProductLikesService],
  exports: [ProductLikesLoaderService]
})
export class ProductLikesModule {}
