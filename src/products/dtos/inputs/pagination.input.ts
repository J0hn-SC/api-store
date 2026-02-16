import { InputType, Field, Int } from '@nestjs/graphql';
import { IsOptional, IsInt, Min } from 'class-validator';

@InputType()
export class PaginationInput {
  @Field(() => Int, { defaultValue: 10 })
  @IsInt()
  @Min(1)
  @IsOptional()
  limit: number;

  @Field(() => Int, { defaultValue: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  offset: number;
}