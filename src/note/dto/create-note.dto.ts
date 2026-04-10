import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty } from "class-validator";

export class CreateNoteDto {

    @IsNotEmpty()
    @ApiProperty()
    title: string;

    @IsNotEmpty()
    @ApiProperty()
    body: string;
}
