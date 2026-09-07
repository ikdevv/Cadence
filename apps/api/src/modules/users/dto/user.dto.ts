import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto.js';
import { Role } from '../../../generated/prisma/enums.js';

export class ListUsersDto extends PaginationDto {
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @Length(1, 120)
  name: string;

  @IsString()
  @Length(8, 128)
  password: string;

  @IsEnum(Role)
  role: Role;
}

export class UpdateRoleDto {
  @IsEnum(Role)
  role: Role;
}

export class UpdateStatusDto {
  @IsBoolean()
  isActive: boolean;
}

