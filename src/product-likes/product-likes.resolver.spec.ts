import { Test, TestingModule } from '@nestjs/testing';
import { ProductLikesResolver } from './product-likes.resolver';
import { ProductLikesService } from './products-likes.service';
import { CaslAbilityFactory } from '../casl/factories/casl-ability.factory';
import { Reflector } from '@nestjs/core';

describe('ProductLikesResolver', () => {
  let resolver: ProductLikesResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductLikesResolver,
        { provide: ProductLikesService, useValue: {} },
        { provide: CaslAbilityFactory, useValue: {} },
        { provide: Reflector, useValue: {} }
      ],
    }).compile();

    resolver = module.get<ProductLikesResolver>(ProductLikesResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
