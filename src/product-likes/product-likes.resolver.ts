import { Resolver, Mutation, Args, Query, ID } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { ProductLikesService } from './products-likes.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { ProductLikeEntity } from './entities/product-like.entity';
import { Action } from '../casl/interfaces/casl.types';
import { CheckPolicies } from 'src/casl/decorators/policies.decorator';

@Resolver()
export class ProductLikesResolver {
  constructor(private readonly likeService: ProductLikesService) {}

    @Mutation(() => ProductLikeEntity)
    @CheckPolicies(ability => ability.can(Action.Create, 'Like'))
    async likeProduct(
        @Args('productId', { type: () => ID }) productId: string,
        @CurrentUser() user,
    ) {
        return await this.likeService.likeProduct(user.id, productId);
    }

    @Mutation(() => ProductLikeEntity)
    @CheckPolicies(ability => ability.can(Action.Delete, 'Like'))
    async unlikeProduct(
        @Args('productId', { type: () => ID }) productId: string,
        @CurrentUser() user,
    ) {
        return await this.likeService.unlikeProduct(user.id, productId);
    }

    @Mutation(() => ProductLikeEntity)
    @CheckPolicies(ability => ability.can(Action.Manage, 'Like'))
    async toggleLikeProduct(
        @Args('productId', { type: () => ID }) productId: string,
        @CurrentUser() user,
    ) {
        return this.likeService.toggleLikeProduct(user.id, productId);
    }

    @Query(() => ProductLikeEntity)
    @CheckPolicies(ability => ability.can(Action.Read, 'Like'))
    async isProductLiked(
        @Args('productId', { type: () => ID }) productId: string,
        @CurrentUser() user,
    ) {
        return this.likeService.find(user.id, productId);
    }
}
