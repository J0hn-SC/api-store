import { ObjectType, Field, ID } from '@nestjs/graphql';

@ObjectType()
export class CategoryEntity {
    @Field(() => ID)
    id: string;

    @Field()
    name: string;
}