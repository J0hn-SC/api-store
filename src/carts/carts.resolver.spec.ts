import { Test, TestingModule } from '@nestjs/testing';
import { CartsResolver } from './carts.resolver';

describe('CartsResolver', () => {
  let resolver: CartsResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CartsResolver],
    }).compile();

    resolver = module.get<CartsResolver>(CartsResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
