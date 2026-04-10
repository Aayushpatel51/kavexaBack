import { Injectable } from '@nestjs/common';
import { WaitlistDto } from './dto/waitlist.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class WaitlistService {

    constructor(private readonly prismaService: PrismaService) {}

    async waitlistUser(waitlistDto: WaitlistDto) {
        // Implementation for waitlist user registration logic
        /**
         * 1. validate the user input
         * 2. save the user to the database
         * 3. return the user information
         */
        return this.prismaService.waitlist.create({ data: waitlistDto });
    }

}
