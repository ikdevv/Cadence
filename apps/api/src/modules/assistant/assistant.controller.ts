import { Body, Controller, Post } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { AssistantService } from './assistant.service.js';
import { ReportChatDto } from './dto/report-chat.dto.js';

@Roles('MANAGER', 'ADMIN')
@Controller('assistant')
export class AssistantController {
  constructor(private readonly assistant: AssistantService) {}

  @Post('report-chat')
  chat(@CurrentUser('id') userId: string, @Body() dto: ReportChatDto) {
    return this.assistant.chat(userId, dto);
  }
}
