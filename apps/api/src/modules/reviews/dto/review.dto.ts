import { IsOptional, IsString, Length } from 'class-validator';

export class ApproveDto {
  @IsOptional()
  @IsString()
  @Length(0, 2000)
  comment?: string;
}

export class RequestChangesDto {
  /** Required: a rejection with no explanation is a broken workflow. */
  @IsString()
  @Length(5, 2000, {
    message: 'Explain what needs correcting (at least 5 characters)',
  })
  comment: string;
}
