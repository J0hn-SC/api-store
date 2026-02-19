import { Field, InputType } from "@nestjs/graphql";
import { IsAlpha, IsOptional, IsPhoneNumber, IsString, Length, MaxLength } from 'class-validator';

@InputType()
export class CreateAddressInput {
    @Field({ nullable: true })
    @IsOptional()
    @IsString()
    @Length(2, 100)
    name?: string;

    @Field()
    @IsString()
    @Length(2, 100)
    address: string;

    @Field()
    @IsString()
    @IsAlpha()
    country: string;

    @Field()
    @IsString()
    city: string;

    @Field({ nullable: true })
    @IsOptional()
    @MaxLength(12)
    phoneNumber?: string;
}