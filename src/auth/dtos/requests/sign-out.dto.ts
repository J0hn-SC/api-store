import { IsString } from 'class-validator';

export class SignOutDto {
  @IsString()
  refreshToken!: string;
}