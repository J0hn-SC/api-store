import { Injectable, Scope } from "@nestjs/common";
import { ProductLikesService } from "./products-likes.service";
import DataLoader from "dataloader";


@Injectable({ scope: Scope.REQUEST })
export class ProductLikesLoaderService {
    constructor(private readonly likesService: ProductLikesService) {}

    public readonly batchLikes = new DataLoader<string, number>(async (productIds: string[]) => {
        const countsMap = await this.likesService.getCountsByProductIds(productIds);
        return productIds.map(id => countsMap[id] || 0);
    });

    private isLikedLoader: DataLoader<string, boolean> | null = null;

    public getIsLikedLoader(userId: string) {
        if (this.isLikedLoader) return this.isLikedLoader;

        this.isLikedLoader = new DataLoader<string, boolean>(async (productIds: string[]) => {
            const isLikedMap = await this.likesService.getIsLikedByProductIds(productIds, userId);
            return productIds.map(id => isLikedMap[id] || false);
        });

        return this.isLikedLoader;
    }
}