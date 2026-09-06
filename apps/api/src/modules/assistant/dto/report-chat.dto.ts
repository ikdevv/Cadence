import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ReportStatus } from '../../../generated/prisma/enums.js';

export class ReportChatFiltersDto {
  /** Exact week match. Wins over from/to when both are supplied, same as the team dashboard. */
  @IsOptional()
  @IsDateString()
  week?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  projectId?: string;

  @IsOptional()
  @IsEnum(ReportStatus)
  status?: ReportStatus;
}

export class ReportChatMessageDto {
  @IsIn(['user', 'assistant'])
  role!: 'user' | 'assistant';

  @IsString()
  @MaxLength(4000)
  content!: string;
}

export class ReportChatDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  question!: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => ReportChatFiltersDto)
  filters?: ReportChatFiltersDto;

  /** Short client-side conversation history for this widget session only — never persisted. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => ReportChatMessageDto)
  history?: ReportChatMessageDto[];
}
