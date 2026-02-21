import { User } from '@prisma/client';
export type CurrentUserInterface = Omit<User, 'password'>