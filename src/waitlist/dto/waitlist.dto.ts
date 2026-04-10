import { ApiProperty } from "@nestjs/swagger";
import { IsEmail } from "class-validator";

export class WaitlistDto {
    @IsEmail()
    @ApiProperty()
    email: string;
}