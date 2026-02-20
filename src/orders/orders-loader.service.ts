import { Injectable, Scope } from "@nestjs/common";
import { OrdersService } from "./orders.service";
import DataLoader from "dataloader";
import { OrderItemEntity } from "./entities/order-item.entity";

@Injectable({ scope: Scope.REQUEST })
export class OrdersLoader {
    constructor(private readonly ordersService: OrdersService) { }

    public readonly batchItems = new DataLoader<string, OrderItemEntity[]>(async (orderIds: string[]) => {
        const items = await this.ordersService.findItemsByOrderIds(orderIds);
        const itemsMap = new Map<string, OrderItemEntity[]>();

        items.forEach(item => {
            if (!itemsMap.has(item.orderId)) {
                itemsMap.set(item.orderId, []);
            }
            // @ts-ignore: Prisma Decimal to number mismatch handled by serializer/transformer
            itemsMap.get(item.orderId)?.push(item);
        });

        return orderIds.map(id => itemsMap.get(id) || []);
    });
}
