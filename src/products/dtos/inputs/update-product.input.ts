import { InputType, Field, PartialType, ID } from '@nestjs/graphql';
import { CreateProductInput } from './create-product.input';
import { IsUUID, IsNotEmpty } from 'class-validator';

@InputType()
export class UpdateProductInput extends PartialType(CreateProductInput) {

  @Field(() => ID)
  @IsUUID()
  @IsNotEmpty()
  id: string;

}