import { Args, Mutation, Query, Resolver, ID, ResolveField, Parent } from '@nestjs/graphql';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { OrderEntity } from './entities/order.entity';
import { OrdersService } from './orders.service';
import { CreateOrderInput } from './input/create-order.input';
import { OrderFilterInput } from './input/order-filter.input';
import { Action } from '../casl/interfaces/casl.types';
import { CheckPolicies } from '../casl/decorators/policies.decorator';
import { OrderItemEntity } from './entities/order-item.entity';
import { OrdersLoader } from './orders-loader.service';

@Resolver(() => OrderEntity)
export class OrdersResolver {
    constructor(private readonly service: OrdersService, private readonly ordersLoader: OrdersLoader) { }

    @Mutation(() => OrderEntity)
    createOrder(
        @CurrentUser() user,
        @Args('input') input: CreateOrderInput,
    ) {
        return this.service.createOrder(user.id, input);
    }

    @CheckPolicies(ability => ability.can(Action.Create, 'Order'))
    @Query(() => [OrderEntity])
    myOrders(
        @CurrentUser() user,
        @Args('filter', { nullable: true }) filter?: OrderFilterInput,
    ) {
        return this.service.findOrders(user.id, filter);
    }

    @ResolveField(() => [OrderItemEntity])
    items(@Parent() order: OrderEntity) {
        return this.ordersLoader.batchItems.load(order.id);
    }

    @CheckPolicies(ability => ability.can(Action.Update, 'Order'))
    @Query(() => [OrderEntity])
    orders(
        @Args('filter', { nullable: true }) filter?: OrderFilterInput,
    ) {
        return this.service.findOrders(undefined, filter);
    }

    @Mutation(() => OrderEntity)
    @CheckPolicies(ability => ability.can(Action.Update, 'Order'))
    processOrder(@Args('id', { type: () => ID }) id: string) {
        return this.service.processOrder(id);
    }

    @Mutation(() => OrderEntity)
    @CheckPolicies(ability => ability.can(Action.Update, 'Order'))
    shipOrder(@Args('id', { type: () => ID }) id: string) {
        return this.service.shipOrder(id);
    }

    @Mutation(() => OrderEntity)
    @CheckPolicies(ability => ability.can(Action.Update, 'Order'))
    cancelOrder(@Args('id', { type: () => ID }) id: string) {
        return this.service.cancelOrder(id);
    }

    @Mutation(() => OrderEntity)
    @CheckPolicies(ability => ability.can(Action.Update, 'Order'))
    deliverOrder(@CurrentUser() user, @Args('id', { type: () => ID }) id: string) {
        return this.service.deliverOrder(user.id, id);
    }

}