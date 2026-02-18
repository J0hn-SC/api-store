import { Test, TestingModule } from '@nestjs/testing';
import { PromoCodesResolver } from './promo-codes.resolver';

describe('PromoCodesResolver', () => {
  let resolver: PromoCodesResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PromoCodesResolver],
    }).compile();

    resolver = module.get<PromoCodesResolver>(PromoCodesResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
