import { registerEnumType } from '@nestjs/graphql';

export enum PromoCodeStatus {
  ACTIVE = 'ACTIVE',
  DISABLED = 'DISABLED',
}

registerEnumType(PromoCodeStatus, {
  name: 'PromoCodeStatus',
  description: 'Posible states for Promo Code Status',
});