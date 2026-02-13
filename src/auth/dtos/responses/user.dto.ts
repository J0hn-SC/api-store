import { Exclude, Expose } from 'class-transformer'

@Exclude()
export class UserDto {
  @Expose()
  readonly id!: string

  @Expose()
  readonly firstName: string | null

  @Expose()
  readonly lastName: string | null

  @Expose()
  readonly email!: string

  @Expose()
  readonly role!: string

}