import { Body, Controller, Post, Request } from '@nestjs/common';
import { SignUpDto } from './dtos/requests/signup.dto';
import { AuthService } from './auth.service';
import { SignInDto } from './dtos/requests/signin.dto';
import { RefreshTokenDto } from './dtos/requests/refresh-token.dto';
import { ForgotPasswordDto } from './dtos/requests/forgot-password.dto';
import { ResetPasswordDto } from './dtos/requests/reset-password.dto';
import { CurrentUser } from './decorators/current-user.decorator';
import { ChangePasswordDto } from './dtos/requests/change-password.dtos';
import { SignOutDto } from './dtos/requests/signout.dto';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Post('signup')
    signup(@Body() dto: SignUpDto) {
        return this.authService.signup(dto);
    }

    @Post('signin')
    signin(@Body() dto: SignInDto) {
        return this.authService.signin(dto);
    }

    @Post('refresh')
    refresh(@Body() dto: RefreshTokenDto) {
        return this.authService.refresh(dto);
    }

    @Post('signout')
    logout(@CurrentUser() user: any, @Body() dto: SignOutDto) {
        return this.authService.signOut(user.id, dto.refreshToken);
    }

    @Post('forgot-password')
    forgotPassword(@Body() dto: ForgotPasswordDto) {
        return this.authService.forgotPassword(dto.email);
    }

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
