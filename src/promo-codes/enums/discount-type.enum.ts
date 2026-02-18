import { registerEnumType } from '@nestjs/graphql';

export enum DiscountType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED = 'FIXED',
}

registerEnumType(DiscountType, {
  name: 'DiscountType',
  description: 'Posible states for entities',
});