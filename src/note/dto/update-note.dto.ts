import { PartialType } from '@nestjs/mapped-types';
import { CreateNoteDto } from './create-note.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateNoteDto extends PartialType(CreateNoteDto) {
    @ApiPropertyOptional()
    title?: string;

    @ApiPropertyOptional()
    body?: string;
}
