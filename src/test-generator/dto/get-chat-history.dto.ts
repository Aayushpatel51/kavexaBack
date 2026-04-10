// dto/get-chat-history.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { ChatHistory } from 'generated/prisma/client';

export class ChatHistoryResponseDto {
  success: boolean;
  status: number;
  data: ChatHistory[];
}