import { Injectable, Scope } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import DataLoader from 'dataloader';

@Injectable({ scope: Scope.REQUEST })
export class CartItemsLoaderService {
    constructor(private readonly prisma: PrismaService) {}

    public readonly batchItems = new DataLoader(async (cartIds: string[]) => {
        const items = await this.prisma.cartItem.findMany({
            where: { cartId: { in: cartIds } },
            include: { product: true }
        });

        return cartIds.map(id => items.filter(item => item.cartId === id));
    });
}