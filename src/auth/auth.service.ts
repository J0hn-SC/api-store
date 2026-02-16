import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { UsersService } from 'src/users/users.service';
import * as bcrypt from 'bcrypt'
import { JwtService } from '@nestjs/jwt';
import { SignUpDto } from './dtos/requests/sign-up.dto';
import { AuthResponseDto } from './dtos/responses/auth-response.dto';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import ms from 'ms';
import { SignInDto } from './dtos/requests/sign-in.dto';
import crypto from 'crypto';
import { RefreshTokenDto } from './dtos/requests/refresh-token.dto';

@Injectable()
export class AuthService {
    constructor(
        private readonly prismaService: PrismaService,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
        private readonly usersService: UsersService,
    ) {}

    async validateUser(email: string, password: string) {
        const user = await this.usersService.findByEmail(email);
        if (!user) return null;

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return null;

        return user;
    }

    async signup(input: SignUpDto) {
        const hashedPassword = await bcrypt.hash(input.password, 10);
        await this.usersService.createUser({...input, password: hashedPassword});
    }

    async generateAccessToken(userId: string) {
        const payload = { sub: userId };

        const accessToken = this.jwtService.sign(payload, {
            secret: this.configService.get('JWT_ACCESS_SECRET'),
            expiresIn: this.configService.get('JWT_ACCESS_EXPIRES'),
        });

        return accessToken;
    }

    async generateAndSaveRefreshToken(userId: string) {
        const sessionId = crypto.randomUUID();
        const payload = { sub: userId, sid: sessionId };

        const refreshExpiresInStr = this.configService.get('JWT_REFRESH_EXPIRES')

        const refreshToken = this.jwtService.sign(payload, {
            secret: this.configService.get('JWT_REFRESH_SECRET'),
            expiresIn: refreshExpiresInStr,
        });

        const expiresAt = new Date(Date.now() + ms(refreshExpiresInStr));
        const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
        
        await this.prismaService.userSession.create({
            data: {
                id: sessionId,
                userId: userId,
                tokenHash: hashedRefreshToken,
                expiresAt: expiresAt,
                ipAddress: ''
            },
        });

        return refreshToken;
    }

    async signin(input: SignInDto): Promise<AuthResponseDto> {
        const user = await this.usersService.findByEmail(input.email)
        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const isPasswordValid = await bcrypt.compare(
            input.password,
            user.password
        );
        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const accessToken = await this.generateAccessToken(user.id);
        const refreshToken = await this.generateAndSaveRefreshToken(user.id)
        

        return {
            accessToken: accessToken,
            refreshToken: refreshToken,
            expiresIn: 900,
            user: user,
        };
    }

    async refresh(input: RefreshTokenDto): Promise<AuthResponseDto> {

        const payload = this.jwtService.verify(input.refreshToken, { 
            secret: this.configService.get('JWT_REFRESH_SECRET'),
        });

        if (!payload) {
            throw new UnauthorizedException('Invalid or expired refresh token');
        }

        const session = await this.prismaService.userSession.findFirst({ 
            where: { id: payload.sid, isRevoked: false} 
        });

        if (!session || session.isRevoked) {
            throw new UnauthorizedException('Invalid or expired refresh token');
        }

        const isMatch = await bcrypt.compare(input.refreshToken, session.tokenHash);

        if (!isMatch) {
            throw new UnauthorizedException('Este token ya no es válido');
        }

        await this.prismaService.userSession.update({
            where: { id: session.id },
            data: { isRevoked: true },
        });

        const accessToken = await this.generateAccessToken(payload.sub);
        const newRefreshToken = await this.generateAndSaveRefreshToken(payload.sub)

        return {
            accessToken: accessToken,
            refreshToken: newRefreshToken,
            expiresIn: 900,
        };
    }

    async signOut(userId: string, refreshToken: string) {

        const payload = this.jwtService.decode(refreshToken);

        const session = await this.prismaService.userSession.findFirst({
            where: { id: payload.sid, userId: userId, isRevoked: false }
        });

        if (!session || session.isRevoked) {
            throw new UnauthorizedException('Invalid or expired refresh token');
        }

        await this.prismaService.userSession.update({
            where: { id: session?.id },
            data: { isRevoked: true },
        });

        return { message: 'Sesión cerrada exitosamente' };
    }

    async forgotPassword(email: string) {
        const user = await this.prismaService.user.findUnique({ where: { email } });
        if (!user) throw new NotFoundException('User not found');

        const resetToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
        const expiresAt = new Date(Date.now() + ms('1h'));

        await this.prismaService.passwordReset.create({
            data: {
                userId: user.id,
                tokenHash: hashedToken,
                expiresAt: expiresAt.toISOString(),
            },
        });

        const resetUrl = `http://api-store.com/reset-password?token=${resetToken}`;
        
        return { resetUrl };
    }

    async resetPassword(token: string, newPassword: string) {
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
        const resetRequest = await this.prismaService.passwordReset.findFirst({
            where: {
                tokenHash: hashedToken,
                expiresAt: { gt: new Date() },
                usedAt: null,
            },
            orderBy: { createdAt: 'desc' }
        });

        if (!resetRequest) throw new UnauthorizedException('Invalid request');

        if (new Date() > new Date(resetRequest.expiresAt)) {
            throw new UnauthorizedException('Token has expired');
        }

        const hashedNewPassword = await bcrypt.hash(newPassword, 10);
        
        await this.prismaService.$transaction([
            this.prismaService.user.update({
                where: { id: resetRequest.userId },
                data: { password: hashedNewPassword }
            }),
            this.prismaService.passwordReset.update({
                where: { id: resetRequest.id },
                data: { usedAt: new Date() }
            })
        ]);

        return { message: 'Password reset successful' };
    }

    async changePassword(userId: string, currentPassword: string, newPassword: string) {

        const user = await this.prismaService.user.findUnique({ where: { id: userId } });
        if (!user) throw new NotFoundException('User not found');

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            throw new UnauthorizedException('Current password is incorrect');
        }

        const hashedNewPassword = await bcrypt.hash(newPassword, 10);

        await this.prismaService.$transaction([
            this.prismaService.user.update({
                where: { id: userId },
                data: { password: hashedNewPassword },
            }),
            this.prismaService.userSession.updateMany({
                where: { userId },
                data: { isRevoked: true },
            })
        ]);

        return { message: 'Password Changed' };
    }
}
