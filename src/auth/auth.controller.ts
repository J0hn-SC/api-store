import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { SignUpDto } from './dtos/requests/sign-up.dto';
import { AuthService } from './auth.service';
import { SignInDto } from './dtos/requests/sign-in.dto';
import { RefreshTokenDto } from './dtos/requests/refresh-token.dto';
import { ForgotPasswordDto } from './dtos/requests/forgot-password.dto';
import { ResetPasswordDto } from './dtos/requests/reset-password.dto';
import { CurrentUser } from './decorators/current-user.decorator';
import { ChangePasswordDto } from './dtos/requests/change-password.dtos';
import { SignOutDto } from './dtos/requests/sign-out.dto';
import { Public } from './decorators/public.decorator';
import { LocalAuthGuard } from './guards/local-auth.guard';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Public()
    @Post('sign-up')
    signup(@Body() dto: SignUpDto) {
        return this.authService.signup(dto);
    }

    @Public()
    @UseGuards(LocalAuthGuard)
    @Post('sign-in')
    signin(@Body() dto: SignInDto) {
        return this.authService.signin(dto);
    }

    @Public()
    @Get('verify-email')
    verifyEmail(@Query('token') token: string) {
        return this.authService.verifyEmail(token);
    }

    @Public()
    @Post('refresh')
    refresh(@Body() dto: RefreshTokenDto) {
        return this.authService.refresh(dto);
    }

    @Public()
    @Post('sign-out')
    logout(@CurrentUser() user: any, @Body() dto: SignOutDto) {
        return this.authService.signOut(user.id, dto.refreshToken);
    }

    @Public()
    @Post('forgot-password')
    forgotPassword(@Body() dto: ForgotPasswordDto) {
        return this.authService.forgotPassword(dto.email);
    }

    @Public()
    @Post('reset-password')
    resetPassword(@Body() dto: ResetPasswordDto) {
        return this.authService.resetPassword(dto.token, dto.newPassword);
    }

    @Post('change-password')
    changePassword(@CurrentUser() user: any, @Body() dto: ChangePasswordDto) {
        return this.authService.changePassword(
            user.id,
            dto.currentPassword,
            dto.newPassword,
        );
    }
}
