import { Field, InputType } from "@nestjs/graphql";
import { IsAlpha, IsOptional, IsPhoneNumber, IsString, Length, MaxLength } from 'class-validator';

@InputType()
export class CreateAddressInput {
    @Field()
    @IsString()
    @Length(2, 100)
    addressLine1: string;

    @Field({ nullable: true })
    @Field()
    @IsString()
    @Length(2, 100)
    addressLine2?: string;

    @Field()
    @IsString()
    city: string;

    @Field()
    @IsString()
    stateProvince: string;

    @Field()
    @IsString()
    @Field({ nullable: true })
    postalCode: string;

    @Field()
    @IsString()
    countryCode: string;

    @Field({ nullable: true })
    @IsOptional()
    @MaxLength(12)
    phoneNumber?: string;
}