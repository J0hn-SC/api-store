import { IsEmail, IsString, MinLength, IsIn, IsOptional } from 'class-validator';

export class SignUpDto {
	@IsEmail()
	readonly email!: string;

	@IsString()
	@MinLength(2)
	@IsOptional()
	readonly firstName?: string;

	@IsString()
	@MinLength(2)
	@IsOptional()
	readonly lastName?: string;

	@IsIn(['CLIENT', 'MANAGER', 'DELIVERY'])
  	role!: 'CLIENT' | 'MANAGER' | 'DELIVERY';

	@IsString()
	@MinLength(8)
	readonly password!: string;
}
