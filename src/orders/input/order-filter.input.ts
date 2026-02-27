import { Field, InputType } from "@nestjs/graphql";
import { OrderStatus } from "@prisma/client";
import { IsDate, IsEnum, IsNumber, IsOptional, Min } from "class-validator";

@InputType()
export class OrderFilterInput {
    @Field({ nullable: true })
    @IsOptional()
    @IsEnum(OrderStatus)
    status?: OrderStatus;

    @Field({ nullable: true })
    @IsOptional()
    @IsDate()
    fromDate?: Date;

    @Field({ nullable: true })
    @IsOptional()
    @IsDate()
    toDate?: Date;

    @Field({ nullable: true })
    @IsOptional()
    @IsNumber()
    @Min(0)
    minTotal?: number;

    @Field({ nullable: true })
    @IsOptional()
    @IsNumber()
    @Min(0)
    maxTotal?: number;

    @Field({ nullable: true })
    @IsOptional()
    @IsNumber()
    @Min(1)
    take?: number;

    @Field({ nullable: true })
    @IsOptional()
    @IsNumber()
    @Min(0)
    skip?: number;
}
