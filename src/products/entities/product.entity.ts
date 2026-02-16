import { ObjectType, Field, ID, Float, Int } from '@nestjs/graphql';
import { CategoryEntity } from './category.entity';
import { ProductImageEntity } from './product-image.entity';
import { EntityStatus } from '../dtos/inputs/entity-status.input';

@ObjectType()
export class ProductEntity {
    @Field(() => ID)
    id: string;

    @Field()
    name: string;

    @Field({ nullable: true })
    description?: string;

    @Field(() => Float)
    price: number;

    @Field(() => Int)
    stock: number;

    @Field(() => EntityStatus)
    status: EntityStatus;

    @Field(() => ID)
    categoryId: string;

    @Field(() => CategoryEntity, { nullable: true })
    category?: CategoryEntity;

    @Field(() => [ProductImageEntity], { nullable: true })
    images?: ProductImageEntity[];

    @Field(() => Int, { nullable: true })
    likesCount?: number;
}