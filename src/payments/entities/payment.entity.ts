import { Field, ID, ObjectType } from "@nestjs/graphql";
import { IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min, IsDate } from 'class-validator';
import { PaymentStatus } from "../enums/payment-status.enum";
import { Decimal, JsonValue } from "@prisma/client/runtime/client";

@ObjectType()
export class PaymentEntity {
    @Field()
    @IsUUID()
    id: string;

    @Field(() => ID)
    @IsString()
    orderId: string;

    @Field(() => String)
    @IsUUID()
    @IsOptional()
    userId: string | null;

    @Field(() => String)
    @IsString()
    @IsOptional()
    externalPaymentId: string | null;

    @Field(() => PaymentStatus)
    @IsEnum(PaymentStatus)
    status: string;

    @Field(() => String)
    @IsNumber()
    @Min(0)
    amount: Decimal;

    @Field(() => String)
    @IsString()
    currency: string;

    @Field(() => String)
    @IsString()
    @IsOptional()
    paymentMethodType: string | null;

    @Field(() => String)
    @IsString()
    provider: string;

    // @Field(() => [String], { nullable: true })
    // metadata: Record<string, any> | null;
    @Field(() => [String], { nullable: true })
    @IsString()
    @IsOptional()
    metadata: JsonValue | null;

    @Field(() => String)
    @IsString()
    @IsOptional()
    errorCode: string | null;

    @Field()
    @IsDate()
    createdAt: Date;

    @Field()
    @IsDate()
    updatedAt: Date;

}