import { Process, Processor } from '@nestjs/bull';
import type { Job } from 'bull';
import { MailerService } from '@nestjs-modules/mailer';

@Processor('mail-queue')
export class MailProcessor {
    constructor(private readonly mailerService: MailerService) { }

    @Process({ name: 'send-mail', concurrency: 5 })
    async handleSendMail(job: Job) {
        const { type, data } = job.data;

        try {
            switch (type) {
                case 'confirm-email':
                    await this.mailerService.sendMail({
                        to: data.email,
                        subject: 'Welcome! Confirm your account',
                        template: './confirm-email',
                        context: {
                            name: data.name,
                            url: data.url,
                        },
                    });
                    break;

                case 'reset-password':
                    await this.mailerService.sendMail({
                        to: data.email,
                        subject: 'Forgot password',
                        template: './reset-password',
                        context: {
                            url: data.url,
                        },
                    });
                    break;

                case 'password-changed':
                    await this.mailerService.sendMail({
                        to: data.email,
                        subject: 'Password Changed Successfully',
                        template: './password-changed',
                        context: {
                            name: data.name,
                        },
                    });
                    break;

                case 'low-stock':
                    await this.mailerService.sendMail({
                        to: data.email,
                        subject: `Only ${data.stock} units of ${data.productName} remain`,
                        template: './low-stock-alert',
                        context: {
                            productName: data.name,
                            productDescription: data.description,
                            productImage: data.images[0].url,
                            stock: data.stock,
                        },
                    });
                    break;

                default:
                    console.warn(`Type of email incorrect: ${type}`);
            }
        } catch (error) {
            console.error(`Error sending email ${type}:`, error);
            throw error;
        }
    }
}