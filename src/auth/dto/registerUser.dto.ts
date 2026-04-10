import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsString, IsStrongPassword } from "class-validator";

export class RegisterUserDto {

    @IsNotEmpty()
    @IsString()
    @ApiProperty()
    fname: string;

    @IsNotEmpty()
    @IsString()
    @ApiProperty()
    lname: string;

    @IsEmail()
    @ApiProperty()
    email: string;

    @IsStrongPassword({minLength: 8, minLowercase: 1, minUppercase: 1, minNumbers: 1, minSymbols: 1})
    @ApiProperty()
    password: string;
}