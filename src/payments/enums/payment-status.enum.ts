import { registerEnumType } from '@nestjs/graphql';

export enum PaymentStatus {
  PENDING = 'PENDING',
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

registerEnumType(PaymentStatus, {
  name: 'PaymentStatus',
  description: 'Posible states for Order Status',
});