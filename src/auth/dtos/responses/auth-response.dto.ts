import { Exclude, Expose, Type } from 'class-transformer';
import { UserDto } from './user.dto';

@Exclude()
export class AuthResponseDto {
  @Expose()
  accessToken!: string;

  @Expose()
  refreshToken!: string;

  // @Expose()
  // tokenType: string = 'Bearer';

  @Expose()
  expiresIn!: number;

  @Expose()
  @Type(() => UserDto)
  user?: UserDto;
}