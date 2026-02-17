import { ObjectType, Field, ID } from '@nestjs/graphql';

@ObjectType()
export class ProductLikeEntity {
  @Field()
  userId: string;

  @Field()
  productId: string;

  @Field()
  createdAt: string;
}