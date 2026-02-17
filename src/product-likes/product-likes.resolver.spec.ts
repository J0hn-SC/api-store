import { Test, TestingModule } from '@nestjs/testing';
import { ProductLikesResolver } from './product-likes.resolver';

describe('ProductLikesResolver', () => {
  let resolver: ProductLikesResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProductLikesResolver],
    }).compile();

    resolver = module.get<ProductLikesResolver>(ProductLikesResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
