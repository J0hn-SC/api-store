import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreatePromoCodeInput } from './input/create-promo-code.input';
import { UpdatePromoCodeInput } from './input/update-promo-code.input';
import { PromoCodeStatus } from './enums/promo-code-status.enum';
import { DiscountType } from './enums/discount-type.enum';
import { PromoCode } from '@prisma/client';

@Injectable()
export class PromoCodesService {
    constructor(private readonly prisma: PrismaService) {}

    async create(input: CreatePromoCodeInput) {
        if (!input.expirationDate && !input.usageLimit) {
            throw new BadRequestException('A promo code must have at least an expiration date or a usage limit to prevent infinite abuse.');
        }

        if(input.discountType === DiscountType.PERCENTAGE && input.discountValue > 100) {
            throw new BadRequestException('For Percentage Discount, the discount value must be between 0 and 100');
        }

        return this.prisma.promoCode.create({ 
            data: {...input, usageCount: 0}
        });
    }

    async findAll() {
        return this.prisma.promoCode.findMany({
            orderBy: { createdAt: 'desc' },
        });
    }

    async findById(id: string) {
        const promo = await this.prisma.promoCode.findUnique({ where: { id } });
        if (!promo) throw new NotFoundException('Promo code not found');
        return promo;
    }

    async update(id: string, input: UpdatePromoCodeInput) {
        if (!input.expirationDate && !input.usageLimit) {
            throw new BadRequestException('A promo code must have at least an expiration date or a usage limit to prevent infinite abuse.');
        }

        const promo = await this.findById(id);

        if (promo.usageCount > 0) {
            if (input.usageLimit && input.usageLimit < promo.usageCount) {
                throw new BadRequestException(
                    'Usage limit cannot be less than used count',
                );
            }
            if (input.expirationDate && input.expirationDate < new Date()) {
                throw new BadRequestException(
                    'Expiration date can not be less than current Date',
                );
            }
        }

        return this.prisma.promoCode.update({
            where: { id },
            data: input,
        });
    }

    async disable(id: string) {
        return this.prisma.promoCode.update({
            where: { id },
            data: { status: PromoCodeStatus.DISABLED },
        });
    }

    async validatePromoCode( code: string) : Promise<PromoCode> {
        const promo = await this.prisma.promoCode.findUnique({ where: { code } });
        if (!promo) 
            throw new NotFoundException('Promo code not valid');
        if(promo.expirationDate && promo.expirationDate < new Date())
            throw new NotFoundException('Promo code not valid');
        if(promo.usageLimit && promo.usageLimit <= promo.usageCount)
            throw new NotFoundException('Promo code not valid');
        return promo;
    }
}