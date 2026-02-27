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
import type { CurrentUserInterface } from 'src/auth/interfaces/current-user.interface';
import { CreateOrderFromSingleProductInput } from './input/create-order-from-single-product.dto';
import { Public } from 'src/auth/decorators/public.decorator';
import { Role } from '@prisma/client';
import { PaymentEntity } from 'src/payments/entities/payment.entity';
import { PaymentsLoader } from 'src/payments/payments-loader.service';
import { ShipOrderInput } from './input/ship-order.input';

@Resolver(() => OrderEntity)
export class OrdersResolver {
    constructor(private readonly service: OrdersService, private readonly ordersLoader: OrdersLoader, private readonly paymentsLoader: PaymentsLoader) { }

    @Mutation(() => OrderEntity)
    @CheckPolicies(ability => ability.can(Action.Create, 'Order'))
    createOrder(
        @CurrentUser() user: CurrentUserInterface,
        @Args('input') input: CreateOrderInput,
    ) {
        return this.service.createOrderFromCart(user.id, input);
    }

    @Public()
    @Mutation(() => OrderEntity)
    createOrderFromSingleProduct(
        @Args('input') input: CreateOrderFromSingleProductInput,
        @CurrentUser() user?: CurrentUserInterface,
    ) {
        return this.service.createOrderFromSingleProduct(input, user ? user.email : input.email!, user?.id);
    }

    @CheckPolicies(ability => ability.can(Action.Read, 'Order'))
    @Query(() => [OrderEntity])
    myOrders(
        @CurrentUser() user: CurrentUserInterface,
        @Args('filter', { nullable: true }) filter?: OrderFilterInput,
    ) {
        return this.service.findOrders(user.id, user.role, filter);
    }

    @ResolveField(() => [OrderItemEntity])
    items(@Parent() order: OrderEntity) {
        return this.ordersLoader.batchItems.load(order.id);
    }

    @CheckPolicies(ability => ability.can(Action.Read, 'Order'))
    @Query(() => [OrderEntity])
    orders(
        @Args('filter', { nullable: true }) filter?: OrderFilterInput,
    ) {
        return this.service.findOrders(undefined, Role.MANAGER, filter);
    }

    @Public()
    @Query(() => OrderEntity)
    async order(@Args('id', { type: () => ID }) id: string) {
        return this.service.findById(id);
    }

    @Mutation(() => OrderEntity)
    @CheckPolicies(ability => ability.can(Action.Update, 'Order'))
    processOrder(@Args('id', { type: () => ID }) id: string) {
        return this.service.processOrder(id);
    }

    @Mutation(() => OrderEntity)
    @CheckPolicies(ability => ability.can(Action.Update, 'Order'))
    shipOrder(@Args('input') input: ShipOrderInput) {
        return this.service.shipOrder(input.orderId, input.deliveryUserId);
    }

    @Mutation(() => OrderEntity)
    @CheckPolicies(ability => ability.can(Action.Cancel, 'Order'))
    cancelOrder(@Args('id', { type: () => ID }) id: string) {
        return this.service.cancelOrder(id);
    }

    @Mutation(() => OrderEntity)
    @CheckPolicies(ability => ability.can(Action.Deliver, 'Order'))
    deliverOrder(@CurrentUser() user: CurrentUserInterface, @Args('id', { type: () => ID }) id: string) {
        return this.service.deliverOrder(user.id, id);
    }

    @Query(() => [OrderEntity])
    @CheckPolicies(ability => ability.can(Action.Read, 'Order'))
    availableOrders() {
        return this.service.findAvailableOrders();
    }

    @Query(() => [OrderEntity])
    @CheckPolicies(ability => ability.can(Action.Read, 'Order'))
    deliveryHistory(@CurrentUser() user: CurrentUserInterface) {
        return this.service.findDeliveryHistory(user.id);
    }

    @ResolveField(() => [PaymentEntity], { nullable: true })
    async payments(@Parent() order: OrderEntity, @CurrentUser() user?: CurrentUserInterface) {
        if (user && user.role === Role.MANAGER) {
            return this.paymentsLoader.batchPayments.load(order.id);
        }
        return null
    }

}