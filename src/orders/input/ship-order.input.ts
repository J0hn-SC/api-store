import { InputType, Field } from '@nestjs/graphql';
import { IsUUID } from 'class-validator';

@InputType()
export class ShipOrderInput {
    @Field()
    @IsUUID()
    deliveryUserId: string;

    @Field()
    @IsUUID()
    orderId: string;

}