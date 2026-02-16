import { BadRequestException, ConflictException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateProductInput } from './dtos/inputs/create-product.input';
import { UpdateProductInput } from './dtos/inputs/update-product.input';
import { ProductFiltersInput } from './dtos/inputs/product-filters.input';
import { PaginationInput } from './dtos/inputs/pagination.input';
import { S3Service } from 'src/s3/s3.service';
import { FileUpload } from 'graphql-upload-ts';

@Injectable()
export class ProductsService {
    constructor(private readonly prisma: PrismaService, private readonly s3Service: S3Service) {}

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

    async attachImage(id: string, file: FileUpload) {

        const { createReadStream, filename, mimetype } = await file;

        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(mimetype)) throw new ConflictException('Invalid type file');
        
        const path = await this.s3Service.uploadFile(createReadStream(), {
            filename,
            mimeType: mimetype,
            folder: 'products',
        });

        try{
            return this.prisma.productImage.create({
                data: {
                    url: path,
                    productId: id,
                },
            });
        }catch (error) {
            await this.s3Service.deleteFile(path);
            if (error.code === 'P2003') {
                throw new BadRequestException(`The product with id ${id} doesn't exist`);
            }
            throw new InternalServerErrorException('Error al registrar imagen');
        }
    }
}