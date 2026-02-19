import { registerEnumType } from '@nestjs/graphql';

export enum CartStatus {
  ACTIVE = 'ACTIVE',
  ORDERED = 'ORDERED',
  ABANDONED = 'ABANDONED'
}

registerEnumType(CartStatus, {
  name: 'CartStatus',
  description: 'Posible states for Promo Code Status',
});