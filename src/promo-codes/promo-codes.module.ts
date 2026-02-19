import { Module } from '@nestjs/common';
import { PromoCodesService } from './promo-codes.service';
import { PromoCodesResolver } from './promo-codes.resolver';

@Module({
  providers: [PromoCodesService, PromoCodesResolver],
  exports: [PromoCodesService]
})
export class PromoCodesModule {}
