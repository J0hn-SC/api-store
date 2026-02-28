import { Test, TestingModule } from '@nestjs/testing';
import { ProductsResolver } from './products.resolver';
import { ProductsService } from './products.service';
import { ProductLikesLoaderService } from '../product-likes/product-likes-loader.service';
import { CaslAbilityFactory } from '../casl/factories/casl-ability.factory';
import { Reflector } from '@nestjs/core';

describe('ProductsResolver', () => {
  let resolver: ProductsResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsResolver,
        { provide: ProductsService, useValue: {} },
        { provide: ProductLikesLoaderService, useValue: {} },
        { provide: CaslAbilityFactory, useValue: {} },
        { provide: Reflector, useValue: {} }
      ],
    }).compile();

    resolver = module.get<ProductsResolver>(ProductsResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
