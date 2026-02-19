import { ObjectType, OmitType } from '@nestjs/graphql';

import { PromoCodeEntity } from './promo-code.entity';

@ObjectType()
export class PublicPromoCodeEntity extends OmitType(
  PromoCodeEntity, 
  ['usageLimit', 'usedCount', 'status', 'createdAt', 'updatedAt'] as const, 
  ObjectType
) {}
