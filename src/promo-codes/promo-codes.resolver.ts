import { Args, Mutation, Resolver, Query, ID } from '@nestjs/graphql';
import { PromoCodeEntity } from './entities/promo-code.entity';
import { PromoCodesService } from './promo-codes.service';
import { CreatePromoCodeInput } from './input/create-promo-code.input';
import { UpdatePromoCodeInput } from './input/update-promo-code.input';
import { Action } from 'src/casl/interfaces/casl.types';
import { CheckPolicies } from 'src/casl/decorators/policies.decorator';


@Resolver(() => PromoCodeEntity)
export class PromoCodesResolver {
    constructor(private readonly service: PromoCodesService) { }

    @Mutation(() => PromoCodeEntity)
    @CheckPolicies(ability => ability.can(Action.Manage, 'PromoCode'))
    createPromoCode(@Args('input') input: CreatePromoCodeInput) {
        return this.service.create(input);
    }

    @Mutation(() => PromoCodeEntity)
    @CheckPolicies(ability => ability.can(Action.Manage, 'PromoCode'))
    updatePromoCode(
        @Args('input') input: UpdatePromoCodeInput,
    ) {
        return this.service.update(input.id, input);
    }

    @Mutation(() => PromoCodeEntity)
    @CheckPolicies(ability => ability.can(Action.Manage, 'PromoCode'))
    disablePromoCode(@Args('id', { type: () => ID }) id: string) {
        return this.service.disable(id);
    }

    @Query(() => [PromoCodeEntity])
    @CheckPolicies(ability => ability.can(Action.Read, 'PromoCode'))
    promoCodes() {
        return this.service.findAll();
    }

    @Query(() => PromoCodeEntity)
    @CheckPolicies(ability => ability.can(Action.Read, 'PromoCode'))
    promoCode(@Args('id', { type: () => ID }) id: string) {
        return this.service.findById(id);
    }
}
