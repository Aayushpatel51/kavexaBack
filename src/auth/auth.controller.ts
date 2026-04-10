import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { RegisterUserDto } from './dto/registerUser.dto';
import { LoginUserDto } from './dto/loginUser.dto';
import { ForgotPasswordDto } from './dto/forgotPassword.dto';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express'

@Controller('auth')
export class AuthController {

    constructor(private readonly authService: AuthService, private configService: ConfigService) {}

    @Post('register')
    register(@Body() registerUserDto: RegisterUserDto) {
        return this.authService.registerUser(registerUserDto);
    }

    @Post('login')
    login(@Body() loginDto: LoginUserDto) {
        return this.authService.loginUser(loginDto);
    }

    @Post('forget-password')
    forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto){
        return this.authService.forgotPassword(forgotPasswordDto);
    }

    @Get('google')
    @UseGuards(AuthGuard('google'))
    googleAuth() {
      return;
    }

    @Get('google/callback')
    @UseGuards(AuthGuard('google'))
    async googleAuthRedirect(
        @Req() req: Request & { user: { email: string } },
        @Res() res: Response, 
      ) {
        const result = await this.authService.googleLogin(req.user)
        const frontendUrl = this.configService.get('FRONTEND_URL')
      
        return res.redirect(`${frontendUrl}/api/auth/callback?token=${result.token}`)
      }
}
