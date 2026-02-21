import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';

@Injectable()
export class MailService {
    constructor(@InjectQueue('mail-queue') private readonly mailQueue: Queue) {}

    async sendConfirmationEmail(name: string, email: string, url: string) {
        await this.mailQueue.add('send-mail', {
            type: 'confirm-email',
            data: { name, email, url },
        });
    }

    async sendResetPasswordEmail(email: string, url: string) {
        await this.mailQueue.add('send-mail', {
            type: 'reset-password',
            data: { email, url },
        });
    }

    async sendLowStockAlert(email: string, productData: {
        productName: string,
        productDescription: string,
        productImage: string,
        stock: number,
        productUrl: string
    }) {
        await this.mailQueue.add('send-mail', {
            type: 'low-stock',
            data: { email, ...productData },
        });
    }

    async sendMassiveLowStockAlert(users: { email: string }[], productData: any) {
        const jobs = users.map(user => ({
            name: 'send-mail',
            data: {
                type: 'low-stock',
                data: {
                    email: user.email,
                    ...productData
                }
            },
            opts: {
                attempts: 3,
                backoff: 5000,
            }
        }));

        await this.mailQueue.addBulk(jobs);
    }
}