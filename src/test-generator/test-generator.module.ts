import { Module } from '@nestjs/common';
import { TestGeneratorService } from './test-generator.service';
import { TestGeneratorController } from './test-generator.controller';
import { PlaywrightService } from './services/playwright.service';
import { ClaudeService } from './services/claude.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  providers: [TestGeneratorService, ClaudeService, PlaywrightService, PrismaService],
  controllers: [TestGeneratorController]
})
export class TestGeneratorModule {}
