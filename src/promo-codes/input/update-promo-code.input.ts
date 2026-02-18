import { InputType, IntersectionType, PartialType, PickType } from '@nestjs/graphql';
import { CreatePromoCodeInput } from './create-promo-code.input';
import { PromoCodeEntity } from '../entities/promo-code.entity';

@InputType()
export class UpdatePromoCodeInput extends IntersectionType(
  PickType(PromoCodeEntity, ['id'] as const, InputType), // Extraemos solo el ID
  PartialType(PickType(CreatePromoCodeInput, ['expirationDate', 'usageLimit', 'status'] as const))
) {}
