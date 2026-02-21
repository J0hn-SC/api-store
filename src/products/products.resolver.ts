import { Resolver, Query, Mutation, Args, ID, ResolveField, Parent, Int } from '@nestjs/graphql';
import { ProductsService } from './products.service';
import { ProductEntity } from './entities/product.entity';
import { CreateProductInput } from './dtos/inputs/create-product.input';
import { UpdateProductInput } from './dtos/inputs/update-product.input';
import { PaginationInput } from './dtos/inputs/pagination.input';
import { ProductFiltersInput } from './dtos/inputs/product-filters.input';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { Action } from 'src/casl/interfaces/casl.types';
import { CheckPolicies } from 'src/casl/decorators/policies.decorator';
import { GraphQLUpload } from 'graphql-upload-ts'
import { ProductImageEntity } from './entities/product-image.entity';
import { ProductLikesLoaderService } from 'src/product-likes/product-likes-loader.service';
import { Public } from '../auth/decorators/public.decorator';
import type { CurrentUserInterface } from 'src/auth/interfaces/current-user.interface';


@Resolver(() => ProductEntity)
export class ProductsResolver {
    constructor(private readonly productsService: ProductsService, private readonly productLikesLoaderService: ProductLikesLoaderService) {}

    @Public()
    @Query(() => [ProductEntity])
    async products(
        @Args('filters', { nullable: true }) filters: ProductFiltersInput,
        @Args('pagination') pagination: PaginationInput,
        @CurrentUser() user?,
    ) {
        return this.productsService.findAll(filters, pagination, user?.role);
    }

    @Public()
    @Query(() => ProductEntity)
    async product(@Args('id', { type: () => ID }) id: string) {
        return this.productsService.findById(id);
    }

    @Mutation(() => ProductEntity)
    @CheckPolicies(ability => ability.can(Action.Create, 'Product'))
    async createProduct(
        @Args('input') input: CreateProductInput,
    ) {
        return this.productsService.create(input);
    }

    @Mutation(() => ProductEntity)
    @CheckPolicies(ability => ability.can(Action.Update, 'Product'))
    async updateProduct(
        @Args('input') input: UpdateProductInput,
    ) {
        return this.productsService.update(input.id, input);
    }

    @Mutation(() => ProductEntity)
    @CheckPolicies(ability => ability.can(Action.Update, 'Product'))
    async disableProduct(@Args('id', { type: () => ID }) id: string) {
        return this.productsService.disable(id);
    }

    @Mutation(() => ProductEntity)
    @CheckPolicies(ability => ability.can(Action.Delete, 'Product'))
    async deleteProduct(@Args('id', { type: () => ID }) id: string) {
        return this.productsService.delete(id);
    }

    @Mutation(() => ProductImageEntity)
    async uploadProductImage(
        @Args('id', { type: () => ID }) id: string,
        @Args({ name: 'file', type: () => GraphQLUpload }) file: any,
    ) {
        return this.productsService.attachImage(id, file);
    }

    @ResolveField(() => [ProductImageEntity])
    async images(@Parent() product: ProductEntity) {
        const { id } = product;
        return this.productsService.getProductImages(id);
    }

    @ResolveField(() => Int)
    async likesCount(@Parent() product: ProductEntity) {
        return this.productLikesLoaderService.batchLikes.load(product.id);
    }

    @ResolveField(() => Boolean)
    async isLiked(
        @Parent() product: ProductEntity,
        @CurrentUser() user: CurrentUserInterface,
    ): Promise<boolean> {
        if (!user) return false;
        return this.productLikesLoaderService.getIsLikedLoader(user.id).load(product.id);
    }
}