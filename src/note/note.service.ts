import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuthService } from 'src/auth/auth.service';

@Injectable()
export class NoteService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private readonly prismaService: PrismaService) {}

  async create(createNoteDto: CreateNoteDto, userId: number) {
    const note = await this.prismaService.note.create({
      data: {
        title: createNoteDto.title,
        body: createNoteDto.body,
        userId,        
      },
    });    

    this.logger.log(`Note created successfully: ${note.id}`);

    return note;
  }

  async findAll({take, skip}, userId: number) {
    const notes = await this.prismaService.note.findMany({
      take,
      skip,
      where: {
        userId,
      },
    })
    return {data: notes,total: await this.prismaService.note.count({ where: { userId } }),take,skip,};
  }

  async findOne(id: number, userId: number) {
    const note = await this.prismaService.note.findUnique({ where: { id } });

    if (note?.userId !== userId) {
      this.logger.warn(`Note with id ${id} does not belong to user ${userId}`);
      throw new ForbiddenException('You do not have access to this note');
    }

    if (!note) {
      this.logger.warn(`Note with id ${id} not found`);
      throw new NotFoundException('Note not found');
    }
    return note;
  }

  async update(id: number, updateNoteDto: UpdateNoteDto, userId: number) {
    const note = await this.prismaService.note.findUnique({ where: { id } });

    if (note?.userId !== userId) {
      this.logger.warn(`Note with id ${id} does not belong to user ${userId}`);
      throw new ForbiddenException('You do not have access to this note');
    }

    if (!note) {
      this.logger.warn(`Note with id ${id} not found`);
      throw new NotFoundException('Note not found');
    }

    const updatedNote = await this.prismaService.note.update({
      where: { id },
      data: updateNoteDto,
    });

    this.logger.log(`Note updated successfully: ${updatedNote.id}`);
    return updatedNote;
  }

  async remove(id: number, userId: number) {
    const note = await this.prismaService.note.findUnique({ where: { id } });

    if (note?.userId !== userId) {
      this.logger.warn(`Note with id ${id} does not belong to user ${userId}`);
      throw new ForbiddenException('You do not have access to this note');
    }

    if (!note) {
      this.logger.warn(`Note with id ${id} not found`);
      throw new NotFoundException('Note not found');
    }

    await this.prismaService.note.delete({ where: { id } });
    this.logger.log(`Note removed successfully: ${id}`);
    return { message: 'Note removed successfully' };
  }
}
