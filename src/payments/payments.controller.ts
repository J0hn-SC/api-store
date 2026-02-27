import { Controller, HttpCode, Post, Req, Body } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { Public } from '../auth/decorators/public.decorator';
import { CreatePaymentLinkDto } from './dtos/create-payment-link.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('payments')
export class PaymentsController {
    constructor(
        private readonly paymentsService: PaymentsService,
    ) { }

    @Public()
    @Post('webhooks')
    @HttpCode(200)
    async webhook(@Req() req: Request,
    ) {
        await this.paymentsService.handleWebhook(req)
        return { received: true };
    }

    // @Public()
    // @Post('checkout-link')
    // async createSingleProductLink(
    //     @Body() createDto: CreatePaymentLinkDto,
    //     @CurrentUser() user?
    // ) {
    //     return await this.paymentsService.createPaymentLink(user?.id, createDto);
    // }
}