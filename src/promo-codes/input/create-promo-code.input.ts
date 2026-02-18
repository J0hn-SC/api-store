import { InputType, OmitType } from "@nestjs/graphql";
import { PromoCodeEntity } from "../entities/promo-code.entity";


@InputType()
export class CreatePromoCodeInput extends OmitType(
  PromoCodeEntity, 
  ['id', 'usedCount', 'createdAt', 'updatedAt'] as const, 
  InputType
) {}

