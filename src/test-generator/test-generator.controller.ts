import { Controller, Post, Body, Logger, UseGuards, Get, Param, Res } from '@nestjs/common';
import { TestGeneratorService } from './test-generator.service';
import { TestRequestDto } from './dto/test-request.dto';
import { TestRunResponse } from './interfaces/types';
import { ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from 'src/auth/auth.guard';
import { Response } from 'express';
import { CurrentUser } from 'src/decorators/current-user.decorator';
import { ChatHistoryResponseDto } from './dto/get-chat-history.dto';

@Controller('test-generator')
export class TestGeneratorController {
  private readonly logger = new Logger(TestGeneratorController.name);

  constructor(private readonly service: TestGeneratorService) { }

  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @Post('generate-and-run')
  async generateAndRun(@Body() dto: TestRequestDto, @CurrentUser() user: { sub: number }): Promise<TestRunResponse> {
    this.logger.log(
      `New request — url=${dto.url}  context="${dto.testContext}" user=${user.sub}`,
    );
    return this.service.generateAndRun(dto, user.sub);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @Get('test-report')
  async getTestReport(@CurrentUser() user: {userId: number}) {
    return this.service.getDashboardStats(user.userId);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @Get('chat-history')
  async getChatHistory(
    @CurrentUser() user: { userId: number },
  ): Promise<ChatHistoryResponseDto> {    
    return this.service.getChatHistoryByUser(user.userId);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @Get(':id')
  async downloadTestReport(@Param('id') id: string, @Res() res: Response) {
    await this.service.streamZip(id, res);
  }

}
