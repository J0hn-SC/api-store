import { S3Client, DeleteObjectCommand, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import { Injectable } from '@nestjs/common';
import { Upload } from "@aws-sdk/lib-storage";
import { UploadFileOptions } from './s3.types';
import { ConfigService } from '@nestjs/config';
import { extname } from 'node:path';

@Injectable()
export class S3Service {
    private readonly s3Client: S3Client;
    private readonly bucket?: string;
    private readonly publicUrl?: string;

    constructor(private readonly configService: ConfigService) {
        this.bucket = this.configService.get<string>('AWS_S3_BUCKET_NAME');
        this.publicUrl = this.configService.get<string>('AWS_S3_PUBLIC_URL');

        this.s3Client = new S3Client({
            region: this.configService.get<string>('AWS_S3_REGION')!,
            credentials: {
                accessKeyId: this.configService.get<string>('AWS_S3_ACCESS_KEY_ID')!,
                secretAccessKey: this.configService.get<string>('AWS_S3_SECRET_ACCESS_KEY')!,
            },
        });
    }


    async uploadFile(
        file: Buffer | ReadableStream,
        options: UploadFileOptions,
    ): Promise<string> {

        const uniqueId = crypto.randomUUID();

        let fileExt = extname(options.filename);

        const finalName = `${options.filename.split('.')[0]}-${uniqueId}${fileExt}`
        const folder = options?.folder ? `${options.folder}/` : '';
        const key = `${folder}${finalName}`;
        
        const upload = new Upload({
            client: this.s3Client,
            params: {
                Bucket: this.bucket,
                Key: key,
                Body: file,
                ContentType: options.mimeType,
                ACL: "public-read",
            },
        });

        await upload.done();
        return `${this.publicUrl}/${key}`;
    }

    async deleteFile(fileUrl: string): Promise<void> {
        const key = fileUrl.replace(`${this.publicUrl}/`, '');

        await this.s3Client.send(
            new DeleteObjectCommand({
                Bucket: this.bucket,
                Key: key,
            }),
        );
    }

    async deleteFiles(fileUrls: string[]): Promise<void> {
        if (!fileUrls.length) return;

        const objectsToDelete = fileUrls.map(url => ({
            Key: url.replace(`${this.publicUrl}/`, '')
        }));

        await this.s3Client.send(
            new DeleteObjectsCommand({
                Bucket: this.bucket,
                Delete: {
                    Objects: objectsToDelete,
                    Quiet: true,
                },
            }),
        );
    }
}
