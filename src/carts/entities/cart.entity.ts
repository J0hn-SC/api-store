import { ObjectType, Field, ID, Int } from '@nestjs/graphql';

@ObjectType()
export class CartItemEntity {
    @Field(() => ID)
    id: string;

    @Field()
    productId: string;

    @Field(() => Int)
    quantity: number;
}

@ObjectType()
export class CartEntity {
    @Field(() => ID)
    id: string;

    @Field()
    userId: string;

    @Field(() => [CartItemEntity], {nullable: true})
    items?: CartItemEntity[];
}