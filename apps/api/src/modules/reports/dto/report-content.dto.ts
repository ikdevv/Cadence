import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  TaskPriority,
  TaskStatus,
  TaskType,
} from '../../../generated/prisma/enums.js';

export class TaskDto {
  @IsString()
  @Length(1, 200)
  name: string;

  @IsEnum(TaskPriority)
  priority: TaskPriority;

  @IsEnum(TaskStatus)
  status: TaskStatus;

  @IsInt()
  @Min(0)
  @Max(100)
  plannedPct: number;

  @IsInt()
  @Min(0)
  @Max(100)
  actualPct: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(200)
  hoursPlanned: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(200)
  hoursSpent: number;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  deliverable?: string;
}

export class BlockerDto {
  @IsString()
  @Length(1, 1000)
  description: string;

  @IsOptional()
  @IsBoolean()
  isKeyIssue?: boolean;
}

export class AchievementDto {
  @IsString()
  @Length(1, 1000)
  description: string;

  @IsOptional()
  @IsBoolean()
  isKeyHighlight?: boolean;
}

export class HoursEntryDto {
  @IsEnum(TaskType)
  taskType: TaskType;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(80)
  hours: number;
}

/**
 * The report structure is fixed for every user, so it is one DTO used by every
 * content write. Draft saves are lenient (empty arrays are fine); the
 * completeness rules that only apply at submit time live in
 * ReportsService.assertContentComplete.
 */
export class ReportContentDto {
  @IsOptional()
  @IsString()
  projectId?: string;

  @IsArray()
  @ArrayMinSize(0)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => TaskDto)
  tasks: TaskDto[];

  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => BlockerDto)
  blockers: BlockerDto[];

  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => AchievementDto)
  achievements: AchievementDto[];

  @IsArray()
  @ArrayMaxSize(5)
  @ValidateNested({ each: true })
  @Type(() => HoursEntryDto)
  hours: HoursEntryDto[];

  @IsOptional()
  @IsString()
  @Length(0, 3000)
  nextWeekPlan?: string;

  @IsOptional()
  @IsString()
  @Length(0, 3000)
  notes?: string;

  @IsOptional()
  @IsString()
  @Length(0, 2000)
  links?: string;
}
