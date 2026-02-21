import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { BullModule } from '@nestjs/bull';
import { Global, Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { MailProcessor } from './mail.processor';
import { join } from 'path';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Global()
@Module({
  imports: [
    BullModule.registerQueue({
      name: 'mail-queue',
    }),
    MailerModule.forRootAsync({
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: async (configService: ConfigService) => ({
            transport: {
                host: 'smtp-relay.brevo.com', 
                port: 587,
                secure: false,
                auth: {
                    user: 'a2f26a001@smtp-brevo.com',
                    pass: configService.get<string>('BREVO_PASS'),
                },
                tls: {
                    rejectUnauthorized: false,
                    ciphers: 'SSLv3'
                }
            },
            defaults: {
                from: '"john" <john.41258789@gmail.com>',
            },
            template: {
                dir: join(process.cwd(), 'src/mail/templates'),
                adapter: new HandlebarsAdapter(),
                options: {
                    strict: true,
                },
            },
        }),
    }),
  ],
  providers: [MailService, MailProcessor],
  exports: [MailService],
})
export class MailModule {}
