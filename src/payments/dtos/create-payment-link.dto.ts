import { Type } from "class-transformer";
import { IsEmail, IsInt, IsNotEmpty, IsObject, IsOptional, IsString, Length, ValidateNested, Min } from 'class-validator';

export class ShippingAddressDto {
    @IsString()
    @IsNotEmpty()
    line1: string;

    @IsString()
    @IsOptional()
    line2?: string;

    @IsString()
    @IsNotEmpty()
    city: string;

    @IsString()
    @IsNotEmpty()
    @Length(2, 2)
    country: string;

    @IsString()
    @IsNotEmpty()
    postalCode: string;
}

export class CreatePaymentLinkDto {
    @IsString()
    @IsNotEmpty()
    productId: string;

    @IsInt()
    @IsNotEmpty()
    @Min(1)
    quantity: number;

    @IsEmail()
    @IsNotEmpty()
    email: string;

    @IsObject()
    @IsNotEmpty()
    @ValidateNested()
    @Type(() => ShippingAddressDto)
    shippingAddress: ShippingAddressDto;
}

