import { Injectable, Scope } from "@nestjs/common";
import { PaymentsService } from "./payments.service";
import DataLoader from "dataloader";
import { PaymentEntity } from "./entities/payment.entity";

@Injectable({ scope: Scope.REQUEST })
export class PaymentsLoader {
    constructor(private paymentsService: PaymentsService) { }

    public readonly batchPayments = new DataLoader<string, PaymentEntity[]>(
        async (orderIds: string[]) => {
            const payments = await this.paymentsService.findByOrderIds([...orderIds]);
            return orderIds.map(id => payments.filter(p => p.orderId === id));
        }
    );
}