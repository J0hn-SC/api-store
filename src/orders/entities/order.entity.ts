import { Field, ID, ObjectType } from "@nestjs/graphql";
import { OrderStatus } from '../enums/order-status.enum';
import { IsEnum, IsNumber, IsOptional, IsPositive, IsString, IsUUID, Min, IsDate, ArrayMinSize, ValidateNested } from 'class-validator';
import { PaymentMethod } from "../enums/payment-method.enum";
import { OrderItemEntity } from "./order-item.entity";
import { Type } from 'class-transformer';

@ObjectType()
export class OrderEntity {
    @Field()
    @IsUUID()
    id: string;

    @Field(() => ID)
    @IsNumber()
    orderNumber: number;

    @Field()
    @IsUUID()
    userId: string;

    @Field(() => OrderStatus)
    @IsEnum(OrderStatus)
    status: string;

    @Field()
    @IsNumber()
    @Min(0)
    tax: number;

    @Field()
    @IsNumber()
    @Min(0)
    subtotal: number;

    @Field()
    @IsNumber()
    @Min(0)
    discount: number;

    @Field()
    @IsNumber()
    @IsPositive()
    total: number;

    @Field()
    @IsString()
    currency: string;

    @Field({ nullable: true })
    @IsOptional()
    @IsString()
    promoCodeSnapshot: string;

    // @Field(() => PaymentMethod)
    // @IsEnum(PaymentMethod)
    // paymentMethod: string;

    @Field({ nullable: true })
    @IsString()
    paymentMethodType?: string;

    // @Field({ nullable: true }) 
    // @IsOptional()
    // @IsString()
    // paymentIntentId?: string;

    // @Field({ nullable: true }) 
    // @IsOptional()
    // @IsString()
    // paymentSessionId?: string;

    @Field(() => [OrderItemEntity])
    @ValidateNested({ each: true })
    @Type(() => OrderItemEntity)
    @ArrayMinSize(1)
    items: OrderItemEntity[];

    // @Field() 
    // @IsDate()
    // createdAt: Date;

    // @Field() 
    // @IsDate()
    // updatedAt: Date;
}