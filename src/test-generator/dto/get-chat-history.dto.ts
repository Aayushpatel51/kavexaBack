// dto/get-chat-history.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { ChatHistoryDto } from './chat-history.dto';

export class ChatHistoryResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  status: number;

  @ApiProperty({ type: () => [ChatHistoryDto] })
  data: ChatHistoryDto[];
}