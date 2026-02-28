import { Test, TestingModule } from '@nestjs/testing';
import { CartsResolver } from './carts.resolver';
import { CartsService } from './carts.service';
import { CartItemsLoaderService } from './cart-items-loader.service';
import { CaslAbilityFactory } from '../casl/factories/casl-ability.factory';
import { Reflector } from '@nestjs/core';

describe('CartsResolver', () => {
  let resolver: CartsResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartsResolver,
        { provide: CartsService, useValue: {} },
        { provide: CartItemsLoaderService, useValue: {} },
        { provide: CaslAbilityFactory, useValue: {} },
        { provide: Reflector, useValue: {} }
      ],
    }).compile();

    resolver = module.get<CartsResolver>(CartsResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
