
export class UserEntity {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    createdAt: Date;
    updatedAt?: Date;
    role!: 'CLIENT' | 'MANAGER' | 'DELIVERY';

    constructor(partial: Partial<UserEntity>) {
        Object.assign(this, partial);
    }

}