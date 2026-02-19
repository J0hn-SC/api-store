import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CartStatus } from './enums/cart-status.enum';
import { EntityStatus } from '@prisma/client';
import { PromoCodesService } from 'src/promo-codes/promo-codes.service';

@Injectable()
export class CartsService {
    constructor(private readonly prisma: PrismaService, private readonly promoCodeService: PromoCodesService) {}

    async getOrCreateActiveCart(userId: string) {
        let cart = await this.prisma.cart.findFirst({
            where: { userId, status: CartStatus.ACTIVE},
        });

        cart ??= await this.prisma.cart.create({
            data: { userId },
        });

        return cart;
    }

    async addItem(userId: string, productId: string, quantity: number) {

        const product = await this.prisma.product.findUnique({
            where: {
                id: productId,
                status: EntityStatus.ACTIVE
            },
        });

        if(!product)
            throw new NotFoundException('Product not found');

        const cart = await this.getOrCreateActiveCart(userId);

        const existingItem = await this.prisma.cartItem.findUnique({
            where: {
                cartId_productId: {
                    cartId: cart.id,
                    productId,
                },
            },
        });


        if (existingItem) {
            if(product.stock < existingItem.quantity + quantity)
                throw new ConflictException('Quantity of item exceeds available stock')
            
            await  this.prisma.cartItem.update({
                where: { id: existingItem.id },
                data: { quantity: existingItem.quantity + quantity },
            });


            return cart
        }

        if(product.stock < quantity)
            throw new ConflictException('Quantity of item exceeds available stock')
        await this.prisma.cartItem.create({
            data: {
                cartId: cart.id,
                productId,
                quantity,
            },
        });
        return cart;
    }

    async updateItem(userId: string, itemId: string, quantity: number) {
        const item = await this.prisma.cartItem.findUnique({
            where: { id: itemId, cart: {userId: userId } },
            include: { cart: true },
        });

        if (!item || item.cart.userId !== userId)
        throw new NotFoundException('Item not found');

        const product = await this.prisma.product.findUnique({
            where: {
                id: item.productId,
                status: EntityStatus.ACTIVE
            },
        });

        if(!product)
            throw new NotFoundException('Product not found');

        if(product.stock < quantity)
            throw new ConflictException('Quantity of item exceeds available stock')

        return this.prisma.cartItem.update({
            where: { id: itemId },
            data: { quantity },
        });
    }

    async removeItem(userId: string, itemId: string) {
        const item = await this.prisma.cartItem.findUnique({
            where: { id: itemId, cart: {userId: userId } },
            include: { cart: true },
        });

        if (!item || item.cart.userId !== userId)
        throw new NotFoundException('Item not found');

        await this.prisma.cartItem.delete({ where: { id: itemId } });

        return this.getOrCreateActiveCart(userId);
    }

    async getMyCart(userId: string) {
        return this.getOrCreateActiveCart(userId);
    }

    async clearCart(userId: string) {
        const cart = await this.getOrCreateActiveCart(userId);

        await this.prisma.cartItem.deleteMany({
            where: { cartId: cart.id },
        });

        return cart;
    }

    async getCartItems(cartId: string) {
        const items = await this.prisma.cartItem.findMany({
            where: { cartId: cartId },
        });

        return items;
    }

    async validatePromoCode(userId: string, code: string) {
        const promoCode = await this.promoCodeService.validatePromoCode(code)
        const cart = await this.getOrCreateActiveCart(userId);
        if (promoCode) {
            let newCart = await this.prisma.cart.update({
                where: { id : cart.id },
                data: { promoCodeId: promoCode.id },
            });
            return newCart
            
        }
        return cart
    }

    async getPublicPromoCode(promoCodeId: string) {
        const promoCode = await this.promoCodeService.findById(promoCodeId)
        return promoCode
    }
}