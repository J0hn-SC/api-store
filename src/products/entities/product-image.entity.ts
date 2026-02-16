import { ObjectType, Field, ID } from '@nestjs/graphql';

@ObjectType()
export class ProductImageEntity {
    @Field(() => ID)
    id: string;

    @Field()
    url: string;
}