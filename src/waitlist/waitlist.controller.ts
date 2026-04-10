import { Body, Controller, Post } from '@nestjs/common';
import { WaitlistDto } from './dto/waitlist.dto';
import { WaitlistService } from './waitlist.service';

@Controller('waitlist')
export class WaitlistController {

    constructor(private readonly waitlistService: WaitlistService) {}

    @Post('register')
    register(@Body() waitlistDto: WaitlistDto) {
        return this.waitlistService.waitlistUser(waitlistDto);
    }
}
