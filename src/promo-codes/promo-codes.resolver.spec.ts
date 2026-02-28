import { Test, TestingModule } from '@nestjs/testing';
import { PromoCodesResolver } from './promo-codes.resolver';
import { PromoCodesService } from './promo-codes.service';
import { CaslAbilityFactory } from '../casl/factories/casl-ability.factory';
import { Reflector } from '@nestjs/core';

describe('PromoCodesResolver', () => {
  let resolver: PromoCodesResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PromoCodesResolver,
        { provide: PromoCodesService, useValue: {} },
        { provide: CaslAbilityFactory, useValue: {} },
        { provide: Reflector, useValue: {} }
      ],
    }).compile();

    resolver = module.get<PromoCodesResolver>(PromoCodesResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
