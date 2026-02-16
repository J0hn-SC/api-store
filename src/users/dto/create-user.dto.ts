import { IsEmail, IsString, MinLength, IsIn, IsOptional } from 'class-validator';

export class CreateUserDto {
	@IsEmail()
	readonly email!: string;

	@IsString()
    @IsOptional()
	@MinLength(2)
	readonly firstName?: string;

    @IsString()
    @IsOptional()
	@MinLength(2)
	readonly lastName?: string;

	@IsIn(['CLIENT', 'MANAGER', 'DELIVERY'])
  	role!: 'CLIENT' | 'MANAGER' | 'DELIVERY';

	@IsString()
	@MinLength(8)
	readonly password!: string;
}
