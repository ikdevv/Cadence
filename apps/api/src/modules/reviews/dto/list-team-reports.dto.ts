import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto.js';
import { ReportStatus } from '../../../generated/prisma/enums.js';

export class ListTeamReportsDto extends PaginationDto {
  /** Exact week match. Wins over from/to when both are supplied. */
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
