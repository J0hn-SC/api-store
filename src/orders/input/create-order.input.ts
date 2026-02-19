import { InputType, Field } from '@nestjs/graphql';
import { IsString, IsOptional, IsUUID, Length, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateAddressInput } from './create-address.input';

@InputType()
export class CreateOrderInput {
    @Field({ nullable: true })
    @IsOptional()
    @IsString()
    @Length(8, 20)
    code?: string;

    @Field({ nullable: true })
    @IsOptional()
    @IsUUID()
    addressId?: string;

    @Field(() => CreateAddressInput, { nullable: true })
    @IsOptional()
    @ValidateNested()
    @Type(() => CreateAddressInput)
    newAddress?: CreateAddressInput;
}