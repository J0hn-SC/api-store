import { InputType, Field, Float, Int } from '@nestjs/graphql';
import { IsString, IsNumber, IsInt, Min, IsBoolean, IsOptional } from 'class-validator';

@InputType()
export class CreateProductInput {
    @Field()
    @IsString()
    name: string;

    @Field({ nullable: true })
    @IsOptional()
    @IsString()
    description?: string;

    @Field(() => Float)
    @IsNumber()
    price: number;

    @Field(() => Int)
    @IsInt()
    @Min(0)
    stock: number;

    @Field({ nullable: true })
    @IsOptional()
    @IsBoolean()
    disabled?: boolean;

    @Field()
    @IsString()
    categoryId: string;
}