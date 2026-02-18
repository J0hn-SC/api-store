import { InputType, Field, Int } from '@nestjs/graphql';
import { IsInt, Min, IsUUID } from 'class-validator';

@InputType()
export class UpdateCartItemInput {
    @Field()
    @IsUUID()
    itemId: string;

    @Field(() => Int)
    @IsInt()
    @Min(1)
    quantity: number;
}