import { IsBoolean, IsOptional, IsString, Length, Matches } from 'class-validator';

export class UpdateProjectDto {
  @IsOptional()
  @IsString()
  @Length(2, 80)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(2, 10)
  @Matches(/^[A-Z0-9-]+$/, {
    message: 'code must use uppercase letters, digits and dashes only',
  })
  code?: string;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'color must be a hex value' })
  color?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
