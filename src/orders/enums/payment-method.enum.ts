import { registerEnumType } from '@nestjs/graphql';

export enum PaymentMethod {
  PAYMENT_LINK = 'PAYMENT_LINK',
  PAYMENT_CUSTOM = 'PAYMENT_CUSTOM',
}

registerEnumType(PaymentMethod, {
  name: 'PaymentMethod',
  description: 'Posible states for Payment Method',
});