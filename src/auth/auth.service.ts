import { ConflictException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { UserService } from 'src/user/user.service';
import { RegisterUserDto } from './dto/registerUser.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { LoginUserDto } from './dto/loginUser.dto';
import { ForgotPasswordDto } from './dto/forgotPassword.dto';

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);

    constructor(private readonly userService: UserService, private jwtService: JwtService) {}

    async registerUser(registerUserDto: RegisterUserDto) {
        // Implementation for user registration logic
        /**
         * 1. check if the user already exists
         * 2. validate the user input    
         * 3. hash the password
         * 4. save the user to the database
         * 5. generate a JWT token for the user
         * 6. return the token and user information
         */        
        const saltRounds = 10;
        const existingUser = await this.userService.getUserByEmail(registerUserDto.email);
        if (existingUser) {
            throw new ConflictException('User already exists');
        }
        const hashedPassword = await bcrypt.hash(registerUserDto.password, saltRounds);
        const newUser = await this.userService.createUser({...registerUserDto, password: hashedPassword });        
        this.logger.log(`User registered successfully: ${newUser.id}`);
        const payload = { email: newUser.email, sub: newUser.id };
        const token = await this.jwtService.signAsync(payload);

        return { ...newUser, token };
    }

    async loginUser(loginDto: LoginUserDto) {
        // Implementation for user login logic
        /**
         * 1. check if the user exists
         * 2. validate the user input
         * 3. compare the password with the hashed password in the database
         * 4. generate a JWT token for the user
         * 5. return the token and user information
         */
        const user = await this.userService.getUserByEmail(loginDto.email);
        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        await bcrypt.compare(loginDto.password, user.password).then(isMatch => {
            if (!isMatch) {
                throw new UnauthorizedException('Invalid credentials');
            }
        });

        this.logger.log(`User logged in successfully: ${user.id}`);
        const payload = { email: user.email, sub: user.id };
        const token = await this.jwtService.signAsync(payload);

        return { ...user, token };
    }

    async forgotPassword(forgotPasswordDto: ForgotPasswordDto){
        // Implementation for forgot password logic
        /**
         * 1. check if the user exists
         * 2. generate a password reset token
         * 3. send the password reset token to the user's email
         * 4. return a success message
         */
        const user = await this.userService.getUserByEmail(forgotPasswordDto.email);
        if (!user) {
            throw new UnauthorizedException('You will receive an email if the account exists');
        }

        return { message: 'Password reset token sent to email' };
    }

    async validateGoogleUser(googleProfile: { email: string; fname: string; lname: string }) {
        const existingUser = await this.userService.getUserByEmail(googleProfile.email);
        if (existingUser) {
            return existingUser;
        }

        // Social login users do not provide local password; store a strong random hash.
        const randomPassword = await bcrypt.hash(`${Date.now()}-${Math.random()}`, 10);
        return this.userService.createUser({
            email: googleProfile.email,
            fname: googleProfile.fname,
            lname: googleProfile.lname,
            password: randomPassword,
        });
    }

    async googleLogin(googleUser: { email: string }) {
        const user = await this.userService.getUserByEmail(googleUser.email);
        if (!user) {
            throw new UnauthorizedException('Google authentication failed');
        }

        const payload = { email: user.email, sub: user.id };
        const token = await this.jwtService.signAsync(payload);
        return { ...user, token };
    }
}
