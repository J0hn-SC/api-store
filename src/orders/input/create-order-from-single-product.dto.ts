import { InputType, Field, ID, Int } from '@nestjs/graphql';
import { IsString, IsOptional, IsUUID, Length, ValidateNested, IsEmail, IsNotEmpty, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateAddressInput } from './create-address.input';

@InputType()
export class CreateOrderFromSingleProductInput {

    @Field(() => ID)
    @IsUUID()
    productId: string;

    @Field(() => Int)
    @IsInt()
    @IsNotEmpty()
    @Min(1)
    quantity: number;

    @Field({ nullable: true })
    @IsString()
    @IsOptional()
    @IsNotEmpty()
    fullName?: string;

    @Field({ nullable: true })
    @IsEmail()
    @IsOptional()
    @IsNotEmpty()
    email?: string;

    @Field({ nullable: true })
    @IsString()
    @IsOptional()
    @IsNotEmpty()
    phoneNumber?: string;

    @Field({ nullable: true })
    @IsOptional()
    @IsUUID()
    addressId?: string;

    @Field(() => CreateAddressInput, { nullable: true })
    @IsOptional()
    @ValidateNested()
    @Type(() => CreateAddressInput)
    address?: CreateAddressInput;
}