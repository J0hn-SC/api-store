
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { EntityStatus, Prisma } from '@prisma/client';

@Injectable()
export class ProductLikesService {
  constructor(private readonly prisma: PrismaService) {}

    async find(userId: string, productId: string) {
        const product = await this.prisma.product.findUnique({
            where: {
                id: productId,
                status: EntityStatus.ACTIVE
            },
        });

        if (!product) throw new NotFoundException('Product not found');

        const like = await this.prisma.productLike.findUnique({
            where: {
                userId_productId: {
                    userId,
                    productId,
                },
            },
        });

        return like;
    }

    async likeProduct(userId: string, productId: string) {
        try{
            return await this.prisma.productLike.create({
                data: {
                    userId,
                    productId,
                },
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === 'P2002') {
                    throw new ConflictException('Like already exists');
                }
            }
            throw new ConflictException('Like already exists')
        }
    }

    async unlikeProduct(userId: string, productId: string) {
        try {
            return await this.prisma.productLike.delete({
                where: { 
                    userId_productId: {
                        userId,
                        productId,
                }, },
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === 'P2025') {
                    throw new NotFoundException('Like does not exists or it has been already deleted');
                }
            }
            throw new NotFoundException('Like does not exists or it has been already deleted');
        }
        

    }

    async toggleLikeProduct(userId: string, productId: string) {
        const like = await this.find(userId, productId)
        if (like) {
            return this.unlikeProduct(userId, productId)
        } else {
            return this.likeProduct(userId, productId)
        }
    }

    async getCountsByProductIds(productIds: string[]) {
        const counts = await this.prisma.productLike.groupBy({
            by: ['productId'],
            _count: {
                productId: true,
            },
            where: {
                productId: { in: productIds },
            },
        });

        return counts.reduce((acc, item) => {
            acc[item.productId] = item._count.productId;
            return acc;
        }, {} as Record<string, number>);
    }

    async getIsLikedByProductIds(productIds: string[], userId: string): Promise<Record<string, boolean>> {
        const likes = await this.prisma.productLike.findMany({
            where: {
                userId: userId,
                productId: { in: productIds },
            },
            select: { productId: true },
        });

        return likes.reduce((acc, like) => {
            acc[like.productId] = true;
            return acc;
        }, {} as Record<string, boolean>);
    }
}