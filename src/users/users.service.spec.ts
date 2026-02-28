import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { ConflictException } from '@nestjs/common';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: DeepMockProxy<PrismaService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockDeep<PrismaService>() },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prisma = module.get(PrismaService) as unknown as DeepMockProxy<PrismaService>;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findByEmail', () => {
    it('it should return a User', async () => {
      const mockUser = { id: '1', email: 'test@test.com' } as any;
      prisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findByEmail('test@test.com');

      expect(result).toEqual(mockUser);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@test.com' },
      });
    });

    it('it should return null when user is not found by email', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      const result = await service.findByEmail('notfound@test.com');
      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('should return a user when prisma finds it by id', async () => {
      const mockUser = { id: 'uuid-123', email: 'test@test.com' } as any;
      prisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findById('uuid-123');

      expect(result).toEqual(mockUser);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'uuid-123' },
      });
    });

    it('should return null when user is not found by id', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const result = await service.findById('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('createUser', () => {
    const dto = { email: 'new@test.com', password: '123' };

    it('debe lanzar ConflictException si Prisma devuelve error P2002', async () => {
      const prismaError = { code: 'P2002' };
      prisma.user.create.mockRejectedValue(prismaError);

      await expect(service.createUser(dto as any)).rejects.toThrow(ConflictException);
    });

    it('debe crear el usuario correctamente y devolver solo campos seleccionados', async () => {
      const mockCreatedUser = { id: '1', email: 'new@test.com', firstName: 'John' } as any;
      prisma.user.create.mockResolvedValue(mockCreatedUser);

      const result = await service.createUser(dto as any);

      expect(result).toEqual(mockCreatedUser);
      expect(prisma.user.create).toHaveBeenCalled();
    });
  });

  describe('markAsVerified', () => {
    it('should call prisma update with verified true for the given user id', async () => {
      const userId = 'user-uuid';
      const mockUpdatedUser = { id: userId, verified: true } as any;

      prisma.user.update.mockResolvedValue(mockUpdatedUser);

      const result = await service.markAsVerified(userId);

      expect(result).toEqual(mockUpdatedUser);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { verified: true },
      });
    });

    it('should throw an error if prisma update fails', async () => {
      prisma.user.update.mockRejectedValue(new Error('Prisma error'));

      await expect(service.markAsVerified('any-id')).rejects.toThrow('Prisma error');
    });
  });
});
