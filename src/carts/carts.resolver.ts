import { Resolver, Mutation, Query, Args, ResolveField, Parent } from '@nestjs/graphql';
import { CartsService } from './carts.service';
import { AddToCartInput } from './input/add-to-cart.input';
import { UpdateCartItemInput } from './input/update-cart-item.input';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { CartEntity, CartItemEntity } from './entities/cart.entity';
import { CheckPolicies } from '../casl/decorators/policies.decorator';
import { Action } from '../casl/interfaces/casl.types';

@Resolver(() => CartEntity)
export class CartsResolver {
  constructor(private readonly cartService: CartsService) {}

    @CheckPolicies(ability => ability.can(Action.Read, 'Cart'))
    @Query(() => CartEntity)
    async myCart(@CurrentUser() user) {
        return this.cartService.getMyCart(user.id);
    }

    @CheckPolicies(ability => ability.can(Action.Update, 'Cart'))
    @Mutation(() => CartEntity)
    async addToCart(
        @CurrentUser() user,
        @Args('input') input: AddToCartInput,
    ) {
        return await this.cartService.addItem(user.id, input.productId, input.quantity);
    }

    @CheckPolicies(ability => ability.can(Action.Update, 'Cart'))
    @Mutation(() => CartEntity)
    async updateCartItem(
        @CurrentUser() user,
        @Args('input') input: UpdateCartItemInput,
    ) {
        await this.cartService.updateItem(user.id, input.itemId, input.quantity);
        return true;
    }

    @CheckPolicies(ability => ability.can(Action.Update, 'Cart'))
    @Mutation(() => CartEntity)
    async removeCartItem(
        @CurrentUser() user,
        @Args('itemId') itemId: string,
    ) {
        return this.cartService.removeItem(user.id, itemId);
    }

    @CheckPolicies(ability => ability.can(Action.Update, 'Cart'))
    @Mutation(() => CartEntity)
    async clearCart(@CurrentUser() user) {
        return this.cartService.clearCart(user.id);
    }

    @ResolveField(() => [CartItemEntity])
    async items(@Parent() cart: CartEntity) {
        const { id } = cart;
        return this.cartService.getCartItems(id);
    }
}