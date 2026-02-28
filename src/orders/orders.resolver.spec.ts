import { Test, TestingModule } from '@nestjs/testing';
import { OrdersResolver } from './orders.resolver';
import { OrdersService } from './orders.service';
import { OrdersLoader } from './orders-loader.service';
import { PaymentsLoader } from '../payments/payments-loader.service';
import { CaslAbilityFactory } from '../casl/factories/casl-ability.factory';
import { Reflector } from '@nestjs/core';

describe('OrdersResolver', () => {
  let resolver: OrdersResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersResolver,
        { provide: OrdersService, useValue: {} },
        { provide: OrdersLoader, useValue: {} },
        { provide: PaymentsLoader, useValue: {} },
        { provide: CaslAbilityFactory, useValue: {} },
        { provide: Reflector, useValue: {} }
      ],
    }).compile();

    resolver = module.get<OrdersResolver>(OrdersResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
