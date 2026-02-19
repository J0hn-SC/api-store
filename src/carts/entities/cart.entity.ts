import { ObjectType, Field, ID, Int, Float } from '@nestjs/graphql';
import { PublicPromoCodeEntity } from '../../promo-codes/entities/public-promo-code.entity';

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

    @Field()
    promoCodeId: string;

    @Field(() => [CartItemEntity], {nullable: true})
    items?: CartItemEntity[];

    @Field(() => Int)
    itemsCount?: number; 

    @Field(() => PublicPromoCodeEntity, {nullable: true})
    promoCode?: PublicPromoCodeEntity;

    @Field(() => Float)
    subtotal?: number;

    @Field(() => Float)
    discount?: number;

    @Field(() => Float)
    total?: number;
}