import { registerEnumType } from '@nestjs/graphql';

export enum CartStatus {
  ACTIVE = 'ACTIVE',
  DISABLED = 'DISABLED',
}

registerEnumType(CartStatus, {
  name: 'CartStatus',
  description: 'Posible states for Promo Code Status',
});