import { InputType, Field, Float, Int } from '@nestjs/graphql';
import { IsString, IsNumber, IsInt, Min, IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { EntityStatus } from './entity-status.input';

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

    @Field(() => EntityStatus, { 
        nullable: true,
        defaultValue: EntityStatus.ACTIVE
    })
    @IsOptional()
    @IsEnum(EntityStatus)
    status?: EntityStatus;

    @Field()
    @IsString()
    categoryId: string;
}