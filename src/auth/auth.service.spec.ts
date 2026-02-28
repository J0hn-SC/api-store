import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from 'src/users/users.service';
import { MailService } from 'src/mail/mail.service';
import * as bcrypt from 'bcrypt';
import { SignUpDto } from './dtos/requests/sign-up.dto';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let prismaService: DeepMockProxy<PrismaService>;
  let usersService: UsersService;
  let configService: ConfigService;
  let mailService: MailService;
  let jwtService: JwtService;

  const mockUsersService = {
    findByEmail: jest.fn(),
    createUser: jest.fn(),
    markAsVerified: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockMailService = {
    sendConfirmationEmail: jest.fn(),
    sendResetPasswordEmail: jest.fn(),
    sendPasswordChangedEmail: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
    decode: jest.fn(),
  };

  const mockUser = {
    id: 'uuid-123',
    email: 'test@test.com',
    firstName: 'John',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockDeep<PrismaService>() },
        { provide: UsersService, useValue: mockUsersService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: MailService, useValue: mockMailService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prismaService = module.get(PrismaService) as unknown as DeepMockProxy<PrismaService>;
    usersService = module.get<UsersService>(UsersService);
    configService = module.get<ConfigService>(ConfigService);
    mailService = module.get<MailService>(MailService);
    jwtService = module.get<JwtService>(JwtService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('signup', () => {
    it('should hash password and orchestrate the signup flow correctly', async () => {
      const signUpDto: SignUpDto = {
        email: 'test@test.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
        role: 'CLIENT',
      };

      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');
      mockUsersService.createUser.mockResolvedValue({ id: 'uuid-123', ...signUpDto });

      prismaService.emailVerification.create.mockResolvedValue({ id: 1 } as any);
      mockConfigService.get.mockReturnValue('http://localhost:3000');

      const result = await service.signup(signUpDto);

      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);

      expect(mockUsersService.createUser).toHaveBeenCalledWith({
        ...signUpDto,
        password: 'hashed_password',
      });

      expect(prismaService.emailVerification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'uuid-123',
          token: expect.any(String),
          expiresAt: expect.any(Date)
        })
      });

      expect(mockMailService.sendConfirmationEmail).toHaveBeenCalledWith(
        'John',
        'test@test.com',
        expect.stringContaining('/auth/verify-email?token=')
      );

      expect(result).toHaveProperty('message');
      expect(result.email).toBe('test@test.com');
    });

    it('should use email as name in confirmation email if firstName is missing', async () => {
      const signUpDto: SignUpDto = {
        email: 'test@test.com',
        password: 'password123',
        role: 'CLIENT',
        firstName: 'John',
        lastName: 'Doe',
      };

      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');
      mockUsersService.createUser.mockResolvedValue({ id: 'uuid-123', ...signUpDto });
      prismaService.emailVerification.create.mockResolvedValue({ id: 1 } as any);
      mockConfigService.get.mockReturnValue('http://localhost:3000');

      await service.signup(signUpDto);

      expect(mockMailService.sendConfirmationEmail).toHaveBeenCalledWith(
        'John',
        'test@test.com',
        expect.any(String)
      );
    });

    it('should throw ConflictException if user already exists', async () => {
      const signUpDto: SignUpDto = {
        email: 'exists@test.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
        role: 'CLIENT',
      };
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');
      mockUsersService.createUser.mockRejectedValue(new ConflictException('Email already exists'));

      await expect(service.signup(signUpDto)).rejects.toThrow(ConflictException);
      expect(mockUsersService.createUser).toHaveBeenCalled();
      expect(mockMailService.sendConfirmationEmail).not.toHaveBeenCalled();
    });

    it('should throw error if email verification token creation fails', async () => {
      const signUpDto: SignUpDto = {
        email: 'test@test.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
        role: 'CLIENT',
      };
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');
      mockUsersService.createUser.mockResolvedValue({ id: 'uuid-123', ...signUpDto });
      prismaService.emailVerification.create.mockRejectedValue(new Error('Prisma error'));

      await expect(service.signup(signUpDto)).rejects.toThrow('Prisma error');
      expect(mockMailService.sendConfirmationEmail).not.toHaveBeenCalled();
    });

    it('should successfully register even if email service fails', async () => {
      const signUpDto: SignUpDto = {
        email: 'test@test.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
        role: 'CLIENT',
      };
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');
      mockUsersService.createUser.mockResolvedValue({ id: 'uuid-123', ...signUpDto });
      prismaService.emailVerification.create.mockResolvedValue({ id: 1 } as any);
      mockConfigService.get.mockReturnValue('http://localhost:3000');
      mockMailService.sendConfirmationEmail.mockRejectedValue(new Error('Email service down'));

      const result = await service.signup(signUpDto);

      expect(result).toHaveProperty('message');
      expect(result.email).toBe('test@test.com');
      expect(mockMailService.sendConfirmationEmail).toHaveBeenCalled();
    });
  });

  describe('validateUser', () => {
    const email = 'test@test.com';
    const password = 'password123';

    it('should return null if user is not found', async () => {
      // Arrange
      mockUsersService.findByEmail.mockResolvedValue(null);

      // Act
      const result = await service.validateUser(email, password);

      // Assert
      expect(result).toBeNull();
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('should return null if password does not match', async () => {
      // Arrange
      mockUsersService.findByEmail.mockResolvedValue({ ...mockUser, password: 'hashed_pw' });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      // Act
      const result = await service.validateUser(email, password);

      // Assert
      expect(result).toBeNull();
    });

    it('should return the user if credentials are valid', async () => {
      // Arrange
      const mockUserWithPassword = { ...mockUser, password: 'hashed_pw' };
      mockUsersService.findByEmail.mockResolvedValue(mockUserWithPassword);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      // Act
      const result = await service.validateUser(email, password);

      // Assert
      expect(bcrypt.compare).toHaveBeenCalledWith(password, 'hashed_pw');
      expect(result).toEqual(mockUserWithPassword);
    });
  });

  describe('verifyEmail', () => {
    it('should throw BadRequestException if token is not found', async () => {
      // Arrange
      prismaService.emailVerification.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(service.verifyEmail('bad-token')).rejects.toThrow('Token inválido');
    });

    it('should throw BadRequestException if token is expired', async () => {
      // Arrange
      const expiredToken = { id: 1, token: 'tok', userId: 'u1', expiresAt: new Date('2000-01-01') };
      prismaService.emailVerification.findFirst.mockResolvedValue(expiredToken as any);

      // Act & Assert
      await expect(service.verifyEmail('tok')).rejects.toThrow('El token ha expirado');
    });

    it('should mark user as verified, delete token, and return success message', async () => {
      // Arrange
      const validToken = { id: 1, token: 'tok', userId: 'u1', expiresAt: new Date(Date.now() + 60000) };
      prismaService.emailVerification.findFirst.mockResolvedValue(validToken as any);
      prismaService.emailVerification.delete.mockResolvedValue({} as any);

      // Act
      const result = await service.verifyEmail('tok');

      // Assert
      expect(mockUsersService.markAsVerified).toHaveBeenCalledWith('u1');
      expect(prismaService.emailVerification.delete).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(result).toEqual({ message: 'Email verified' });
    });
  });

  describe('generateAccessToken', () => {
    it('should sign and return an access token', async () => {
      // Arrange
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'JWT_ACCESS_SECRET') return 'access-secret';
        if (key === 'JWT_ACCESS_EXPIRES') return '15m';
      });
      mockJwtService.sign.mockReturnValue('signed-access-token');

      // Act
      const result = await service.generateAccessToken('user-123');

      // Assert
      expect(mockJwtService.sign).toHaveBeenCalledWith(
        { sub: 'user-123' },
        { secret: 'access-secret', expiresIn: '15m' }
      );
      expect(result).toBe('signed-access-token');
    });
  });

  describe('generateAndSaveRefreshToken', () => {
    it('should create a session record and return the refresh token', async () => {
      // Arrange
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'JWT_REFRESH_SECRET') return 'refresh-secret';
        if (key === 'JWT_REFRESH_EXPIRES') return '7d';
      });
      mockJwtService.sign.mockReturnValue('signed-refresh-token');
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-refresh-token');
      prismaService.userSession.create.mockResolvedValue({} as any);

      // Act
      const result = await service.generateAndSaveRefreshToken('user-123');

      // Assert
      expect(mockJwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({ sub: 'user-123' }),
        { secret: 'refresh-secret', expiresIn: '7d' }
      );
      expect(bcrypt.hash).toHaveBeenCalledWith('signed-refresh-token', 10);
      expect(prismaService.userSession.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-123',
            tokenHash: 'hashed-refresh-token',
          })
        })
      );
      expect(result).toBe('signed-refresh-token');
    });
  });

  describe('signin', () => {
    const signInDto = { email: 'test@test.com', password: 'password123' };
    const validUser = { ...mockUser, password: 'hashed_pw', verified: true };

    beforeEach(() => {
      jest.spyOn(service, 'generateAccessToken').mockResolvedValue('access-token');
      jest.spyOn(service, 'generateAndSaveRefreshToken').mockResolvedValue('refresh-token');
    });

    it('should throw UnauthorizedException if user is not found', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      await expect(service.signin(signInDto)).rejects.toThrow('Invalid credentials');
    });

    it('should throw UnauthorizedException if user is not verified', async () => {
      mockUsersService.findByEmail.mockResolvedValue({ ...validUser, verified: false });

      await expect(service.signin(signInDto)).rejects.toThrow('Confirm your email');
    });

    it('should throw UnauthorizedException if password is invalid', async () => {
      mockUsersService.findByEmail.mockResolvedValue(validUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.signin(signInDto)).rejects.toThrow('Invalid credentials');
    });

    it('should return AuthResponseDto on successful signin', async () => {
      mockUsersService.findByEmail.mockResolvedValue(validUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.signin(signInDto);

      expect(service.generateAccessToken).toHaveBeenCalledWith(validUser.id);
      expect(service.generateAndSaveRefreshToken).toHaveBeenCalledWith(validUser.id);
      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresIn: 900,
        user: validUser,
      });
    });
  });

  describe('signOut', () => {
    const userId = 'user-123';
    const refreshToken = 'refresh-token';
    const sessionId = 'session-123';

    beforeEach(() => {
      mockJwtService.decode.mockReturnValue({ sid: sessionId });
    });

    it('should throw UnauthorizedException if session is not found or revoked', async () => {
      prismaService.userSession.findFirst.mockResolvedValue(null);

      await expect(service.signOut(userId, refreshToken)).rejects.toThrow('Invalid or expired refresh token');

      prismaService.userSession.findFirst.mockResolvedValue({ isRevoked: true } as any);
      await expect(service.signOut(userId, refreshToken)).rejects.toThrow('Invalid or expired refresh token');
    });

    it('should revoke session and return success message', async () => {
      const activeSession = { id: sessionId, isRevoked: false };
      prismaService.userSession.findFirst.mockResolvedValue(activeSession as any);
      prismaService.userSession.update.mockResolvedValue({} as any);

      const result = await service.signOut(userId, refreshToken);

      expect(prismaService.userSession.update).toHaveBeenCalledWith({
        where: { id: sessionId },
        data: { isRevoked: true },
      });
      expect(result).toEqual({ message: 'Sesión cerrada exitosamente' });
    });
  });

  describe('refresh', () => {
    const refreshToken = 'old-refresh-token';
    const payload = { sub: 'user-123', sid: 'session-123' };

    beforeEach(() => {
      jest.spyOn(service, 'generateAccessToken').mockResolvedValue('new-access-token');
      jest.spyOn(service, 'generateAndSaveRefreshToken').mockResolvedValue('new-refresh-token');
    });

    it('should throw UnauthorizedException if token is invalid or expired', async () => {
      mockJwtService.verify.mockReturnValue(null);

      await expect(service.refresh({ refreshToken })).rejects.toThrow('Invalid or expired refresh token');
    });

    it('should throw UnauthorizedException if session is not found or revoked', async () => {
      mockJwtService.verify.mockReturnValue(payload);
      prismaService.userSession.findFirst.mockResolvedValue(null);

      await expect(service.refresh({ refreshToken })).rejects.toThrow('Invalid or expired refresh token');

      prismaService.userSession.findFirst.mockResolvedValue({ isRevoked: true } as any);
      await expect(service.refresh({ refreshToken })).rejects.toThrow('Invalid or expired refresh token');
    });

    it('should throw UnauthorizedException if token does not match DB hash', async () => {
      mockJwtService.verify.mockReturnValue(payload);
      prismaService.userSession.findFirst.mockResolvedValue({ id: 'session-123', tokenHash: 'hashed', isRevoked: false } as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.refresh({ refreshToken })).rejects.toThrow('Este token ya no es válido');
    });

    it('should return new tokens and revoke old session on success', async () => {
      mockJwtService.verify.mockReturnValue(payload);
      prismaService.userSession.findFirst.mockResolvedValue({ id: 'session-123', tokenHash: 'hashed', isRevoked: false } as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      prismaService.userSession.update.mockResolvedValue({} as any);

      const result = await service.refresh({ refreshToken });

      expect(prismaService.userSession.update).toHaveBeenCalledWith({
        where: { id: 'session-123' },
        data: { isRevoked: true },
      });
      expect(service.generateAccessToken).toHaveBeenCalledWith('user-123');
      expect(service.generateAndSaveRefreshToken).toHaveBeenCalledWith('user-123');
      expect(result).toEqual({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresIn: 900,
      });
    });
  });

  describe('forgotPassword', () => {
    const email = 'test@test.com';

    it('should throw NotFoundException if user is not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);
      await expect(service.forgotPassword(email)).rejects.toThrow('User not found');
    });

    it('should create password reset record and send email', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser as any);
      prismaService.passwordReset.create.mockResolvedValue({} as any);
      mockConfigService.get.mockReturnValue('http://localhost:3000');

      const result = await service.forgotPassword(email);

      expect(prismaService.passwordReset.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: mockUser.id,
            tokenHash: expect.any(String),
            expiresAt: expect.any(String),
          })
        })
      );
      expect(mockMailService.sendResetPasswordEmail).toHaveBeenCalledWith(
        email,
        expect.stringContaining('http://localhost:3000/auth/reset-password?token=')
      );
      expect(result).toHaveProperty('resetUrl');
    });
  });

  describe('resetPassword', () => {
    const token = 'valid-token';
    const newPassword = 'new-password';

    it('should throw UnauthorizedException if reset request is not found or used', async () => {
      prismaService.passwordReset.findFirst.mockResolvedValue(null);
      await expect(service.resetPassword(token, newPassword)).rejects.toThrow('Invalid request');
    });

    it('should throw UnauthorizedException if token has expired', async () => {
      const expiredRequest = { expiresAt: new Date('2000-01-01').toISOString() };
      prismaService.passwordReset.findFirst.mockResolvedValue(expiredRequest as any);
      await expect(service.resetPassword(token, newPassword)).rejects.toThrow('Token has expired');
    });

    it('should update password, mark token as used, and send email', async () => {
      const validRequest = {
        id: 1,
        userId: mockUser.id,
        expiresAt: new Date(Date.now() + 60000).toISOString(),
        user: mockUser,
      };
      prismaService.passwordReset.findFirst.mockResolvedValue(validRequest as any);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-new-pw');
      prismaService.$transaction.mockResolvedValue([{}, {}] as any);

      const result = await service.resetPassword(token, newPassword);

      expect(bcrypt.hash).toHaveBeenCalledWith(newPassword, 10);
      expect(prismaService.$transaction).toHaveBeenCalled();
      expect(mockMailService.sendPasswordChangedEmail).toHaveBeenCalledWith(mockUser.email, mockUser.firstName);
      expect(result).toEqual({ message: 'Password reset successful' });
    });
  });

  describe('changePassword', () => {
    const userId = 'user-123';
    const currentPassword = 'old-password';
    const newPassword = 'new-password';

    it('should throw NotFoundException if user is not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);
      await expect(service.changePassword(userId, currentPassword, newPassword)).rejects.toThrow('User not found');
    });

    it('should throw UnauthorizedException if current password does not match', async () => {
      prismaService.user.findUnique.mockResolvedValue({ password: 'hashed-old-pw' } as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      await expect(service.changePassword(userId, currentPassword, newPassword)).rejects.toThrow('Current password is incorrect');
    });

    it('should update password, revoke sessions, and send email', async () => {
      prismaService.user.findUnique.mockResolvedValue({ password: 'hashed-old-pw', email: 'test@test.com', firstName: 'John' } as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-new-pw');
      prismaService.$transaction.mockResolvedValue([{}, {}] as any);

      const result = await service.changePassword(userId, currentPassword, newPassword);

      expect(bcrypt.hash).toHaveBeenCalledWith(newPassword, 10);
      expect(prismaService.$transaction).toHaveBeenCalled();
      expect(mockMailService.sendPasswordChangedEmail).toHaveBeenCalledWith('test@test.com', 'John');
      expect(result).toEqual({ message: 'Password Changed' });
    });
  });
});
