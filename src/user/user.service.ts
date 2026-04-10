import { Injectable } from '@nestjs/common';
import { RegisterUserDto } from 'src/auth/dto/registerUser.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class UserService {

    constructor(private readonly prismaService: PrismaService) {}

    async getUserByEmail(email: string) {
        // Implementation for fetching user by email logic
        return await this.prismaService.user.findUnique({ where: { email } });
    }

    createUser(registerUserDto: RegisterUserDto) {
        // Implementation for user creation logic
        /**
         * 1. validate the user input    
         * 2. hash the password
         * 3. save the user to the database
         * 4. return the created user information
         */
        return this.prismaService.user.create({ data: registerUserDto });        
    }

}
