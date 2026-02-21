import { Resolver, Mutation, Query, Args, ResolveField, Parent, Float } from '@nestjs/graphql';
import { CartsService } from './carts.service';
import { AddToCartInput } from './input/add-to-cart.input';
import { UpdateCartItemInput } from './input/update-cart-item.input';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { CartEntity, CartItemEntity } from './entities/cart.entity';
import { CheckPolicies } from '../casl/decorators/policies.decorator';
import { Action } from '../casl/interfaces/casl.types';
import { CartItemsLoaderService } from './cart-items-loader.service';
import { Decimal } from '@prisma/client/runtime/client';
import { DiscountType } from 'src/promo-codes/enums/discount-type.enum';
import { PublicPromoCodeEntity } from '../promo-codes/entities/public-promo-code.entity';
import type { CurrentUserInterface } from 'src/auth/interfaces/current-user.interface';

@Resolver(() => CartEntity)
export class CartsResolver {
  constructor(private readonly cartService: CartsService, private readonly cartItemsLoader: CartItemsLoaderService) {}

    @CheckPolicies(ability => ability.can(Action.Read, 'Cart'))
    @Query(() => CartEntity)
    async myCart(@CurrentUser() user: CurrentUserInterface) {
        return this.cartService.getMyCart(user.id);
    }

    @CheckPolicies(ability => ability.can(Action.Update, 'Cart'))
    @Mutation(() => CartEntity)
    async addToCart(
        @CurrentUser() user: CurrentUserInterface,
        @Args('input') input: AddToCartInput,
    ) {
        return await this.cartService.addItem(user.id, input.productId, input.quantity);
    }

    @CheckPolicies(ability => ability.can(Action.Update, 'Cart'))
    @Mutation(() => CartEntity)
    async updateCartItem(
        @CurrentUser() user: CurrentUserInterface,
        @Args('input') input: UpdateCartItemInput,
    ) {
        await this.cartService.updateItem(user.id, input.itemId, input.quantity);
        return true;
    }

    @CheckPolicies(ability => ability.can(Action.Update, 'Cart'))
    @Mutation(() => CartEntity)
    async removeCartItem(
        @CurrentUser() user: CurrentUserInterface,
        @Args('itemId') itemId: string,
    ) {
        return this.cartService.removeItem(user.id, itemId);
    }

    @CheckPolicies(ability => ability.can(Action.Update, 'Cart'))
    @Mutation(() => CartEntity)
    async clearCart(@CurrentUser() user: CurrentUserInterface) {
        return this.cartService.clearCart(user.id);
    }

    @CheckPolicies(ability => ability.can(Action.Update, 'Cart'))
    @Mutation(() => CartEntity)
    async validatePromoCode(@CurrentUser() user: CurrentUserInterface, @Args('code') code: string) {
        return this.cartService.validatePromoCode(user.id, code);
    }

    @ResolveField(() => [CartItemEntity])
    async items(@Parent() cart: CartEntity) {
        return this.cartItemsLoader.batchItems.load(cart.id);
    }

    @ResolveField(() => Float)
    async itemsCount(@Parent() cart: CartEntity) {
        const items = await this.cartItemsLoader.batchItems.load(cart.id);
        return items.length;
    }

    @ResolveField(() => PublicPromoCodeEntity, { nullable: true })
    async promoCode(@Parent() cart: CartEntity) {
        if (!cart.promoCodeId) return null;
        return this.cartService.getPublicPromoCode(cart.promoCodeId);
    }

    @ResolveField(() => Float)
    async subtotal(@Parent() cart: CartEntity) {
        const items = await this.cartItemsLoader.batchItems.load(cart.id);
        return items.reduce((acc, item) =>  (item.product.price.times(item.quantity).plus(acc)), new Decimal(0));
    }

    @ResolveField(() => Float)
    async discount(@Parent() cart: CartEntity) {
        let subtotal = await this.subtotal(cart)
        const promoCode = await this.promoCode(cart)
        if(promoCode){
            if(promoCode.discountType === DiscountType.FIXED){
                return promoCode.discountValue
            }
            if(promoCode.discountType === DiscountType.PERCENTAGE){
                return subtotal.times(promoCode.discountValue)
            }
        }
        return new Decimal(0)
    }

    @ResolveField(() => Float)
    async total(@Parent() cart: CartEntity) {
        const subtotal = await this.subtotal(cart)
        if(subtotal.equals(0)){
            return subtotal
        }
        const discount = await this.discount(cart)
        const total = subtotal.minus(discount)
        if(total.lessThan(0)){
            return new Decimal(0)
        }
        return total
    }
}