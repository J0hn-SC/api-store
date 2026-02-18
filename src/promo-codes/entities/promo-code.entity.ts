import { Field, ID, ObjectType, Int } from '@nestjs/graphql';
import { DiscountType } from "../enums/discount-type.enum";
import { IsEnum, MinLength, MaxLength, Min, IsAlphanumeric, Matches, IsDate, IsOptional, MinDate, IsInt, IsNumber } from 'class-validator';
import { PromoCodeStatus } from "../enums/promo-code-status.enum";
import { IsFutureDate } from '../../common/decorators/is-future-date.decorator';

@ObjectType()
export class PromoCodeEntity {
    @Field(() => ID)
    id: string;

    @Field()
    @MinLength(8)
    @MaxLength(12)
    @IsAlphanumeric()
    @Matches(/^[A-Z0-9]+$/, { message: 'The code just admits capital letters and numbers' })
    code: string;

    @Field(() => DiscountType)
    @IsEnum(DiscountType)
    discountType: DiscountType;

    @Field()
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    discountValue: number;

    @Field({ nullable: true })
    @IsDate()
    @IsOptional()
    @IsFutureDate()
    expirationDate?: Date;

    @Field(() => Int, { nullable: true })
    @IsOptional()
    @IsInt()
    @Min(1)
    usageLimit?: number;

    @Field(() => Int)
    @IsInt()
    @Min(0)
    usedCount: number;

    @Field({ nullable: true })
    @IsOptional()
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    minimumPurchaseAmount?: number;

    @Field(() => PromoCodeStatus, { 
        nullable: true,
        defaultValue: PromoCodeStatus.ACTIVE
    })
    @IsEnum(PromoCodeStatus)
    status?: PromoCodeStatus;

    @Field()
    @IsDate()
    createdAt: Date;

    @Field()
    @IsDate()
    updatedAt: Date;
}