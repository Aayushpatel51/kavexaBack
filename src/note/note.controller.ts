import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query, ParseIntPipe } from '@nestjs/common';
import { NoteService } from './note.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { AuthGuard } from 'src/auth/auth.guard';
import { ApiBearerAuth } from '@nestjs/swagger';

@Controller('api/notes')
export class NoteController {
  constructor(private readonly noteService: NoteService) {}
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @Post()
  create(@Body() createNoteDto: CreateNoteDto, @Request() req: {user:{sub: number}}) {
    return this.noteService.create(createNoteDto, req.user.sub);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @Get()
  findAll(@Request() req: {user:{sub: number}}, @Query('take', new ParseIntPipe({optional: true})) take?: string, @Query('skip', new ParseIntPipe({optional: true})) skip?: string) {
    return this.noteService.findAll({take: take || 10, skip: skip || 0}, req.user.sub);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: {user:{sub: number}}) {
    return this.noteService.findOne(+id, req.user.sub);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateNoteDto: UpdateNoteDto, @Request() req: {user:{sub: number}}) {
    return this.noteService.update(+id, updateNoteDto, req.user.sub);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: {user:{sub: number}}) {
    return this.noteService.remove(+id, req.user.sub);
  }
}
