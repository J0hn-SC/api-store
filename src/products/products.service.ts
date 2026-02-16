import { Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateProductInput } from './dtos/inputs/create-product.input';
import { UpdateProductInput } from './dtos/inputs/update-product.input';
import { ProductFiltersInput } from './dtos/inputs/product-filters.input';
import { PaginationInput } from './dtos/inputs/pagination.input';

@Injectable()
export class ProductsService {
    constructor(private readonly prisma: PrismaService) {}

    async create(input: CreateProductInput) {
        return this.prisma.product.create({
            data: input,
        });
    }

    async update(id: string, input: UpdateProductInput) {
        return this.prisma.product.update({
            where: { id },
            data: input,
        });
    }

    async disable(id: string) {
        return this.prisma.product.update({
            where: { id },
            data: { disabled: true },
        });
    }

    async delete(id: string) {
        return this.prisma.product.update({
            where: { id },
            data: { disabled: false },
        });
    }

    async findById(id: string) {
        return this.prisma.product.findUnique({
            where: { id },
        });
    }

    async findAll(
        filters: ProductFiltersInput,
        pagination: PaginationInput,
        role: Role,
    ) {
        const where: any = {};

        if (role === Role.CLIENT) {
            where.isActive = true;
        }

        if (filters?.categoryId) where.categoryId = filters.categoryId;

        if (filters?.minPrice || filters?.maxPrice) {
            where.price = {
                gte: filters.minPrice,
                lte: filters.maxPrice,
            };
        }

        if (filters?.search) {
            where.name = {
                contains: filters.search,
                mode: 'insensitive',
            };
        }

        return this.prisma.product.findMany({
            where,
            take: pagination.limit,
            skip: pagination.offset,
            orderBy: { createdAt: 'desc' },
        });
    }
}