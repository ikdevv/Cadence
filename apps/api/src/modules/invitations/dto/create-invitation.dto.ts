import { IsEmail, IsIn } from 'class-validator';

const ROLES = ['MEMBER', 'MANAGER', 'ADMIN'] as const;

export class CreateInvitationDto {
  @IsEmail()
  email!: string;

  @IsIn(ROLES)
  role!: (typeof ROLES)[number];
}
