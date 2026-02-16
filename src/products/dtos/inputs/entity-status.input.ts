import { registerEnumType } from '@nestjs/graphql';

export enum EntityStatus {
  ACTIVE = 'ACTIVE',
  DISABLED = 'DISABLED',
  PENDING = 'PENDING',
  SUSPENDED = 'SUSPENDED',
}

registerEnumType(EntityStatus, {
  name: 'EntityStatus',
  description: 'Posible states for entities',
});