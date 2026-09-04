import { IsDateString, IsString } from 'class-validator';

export class CreateReportDto {
  @IsString()
  projectId: string;

  /** Any date inside the week; the server normalizes it to the Monday. */
  @IsDateString()
  weekStart: string;
}
