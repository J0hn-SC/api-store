import { Test, TestingModule } from '@nestjs/testing';
import { ProductLikesService } from './products-likes.service';

describe('ProductLikesService', () => {
  let service: ProductLikesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProductLikesService],
    }).compile();

    service = module.get<ProductLikesService>(ProductLikesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
