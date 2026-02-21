import { Field, ObjectType } from "@nestjs/graphql";
import { IsNumber, IsPositive, IsString, IsUUID, Min } from "class-validator";

@ObjectType()
export class OrderItemEntity {
    @Field() 
    @IsUUID()
    id: string;

    @Field() 
    @IsUUID()
    orderId: string;

    @Field() 
    @IsUUID()
    productId: string;

    @Field() 
    @IsNumber()
    @IsPositive()
    quantity: number;

    @Field() 
    @IsString()
    nameAtPurchase: string;

    @Field() 
    @IsNumber()
    @Min(0)
    priceAtPurchase: number;

    @Field() 
    @IsNumber()
    @Min(0)
    tax: number;
}