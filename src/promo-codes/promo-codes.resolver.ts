import { Args, Mutation, Resolver, Query, ID } from '@nestjs/graphql';
import { PromoCodeEntity } from './entities/promo-code.entity';
import { PromoCodesService } from './promo-codes.service';
import { CreatePromoCodeInput } from './input/create-promo-code.input';
import { UpdatePromoCodeInput } from './input/update-promo-code.input';


@Resolver(() => PromoCodeEntity)
export class PromoCodesResolver {
    constructor(private readonly service: PromoCodesService) {}

    @Mutation(() => PromoCodeEntity)
    createPromoCode(@Args('input') input: CreatePromoCodeInput) {
        return this.service.create(input);
    }

    @Mutation(() => PromoCodeEntity)
    updatePromoCode(
        @Args('input') input: UpdatePromoCodeInput,
    ) {
        return this.service.update(input.id, input);
    }

    @Mutation(() => PromoCodeEntity)
    disablePromoCode(@Args('id', { type: () => ID }) id: string) {
        return this.service.disable(id);
    }

    @Query(() => [PromoCodeEntity])
    promoCodes() {
        return this.service.findAll();
    }

    @Query(() => PromoCodeEntity)
    promoCode(@Args('id', { type: () => ID }) id: string) {
        return this.service.findById(id);
    }
}
