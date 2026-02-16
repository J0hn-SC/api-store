import { InputType, Field, Float } from '@nestjs/graphql';
import { IsOptional } from 'class-validator';

@InputType()
export class ProductFiltersInput {
  @Field({ nullable: true })
  @IsOptional()
  categoryId?: string;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  minPrice?: number;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  maxPrice?: number;

  @Field({ nullable: true })
  @IsOptional()
  search?: string;
}