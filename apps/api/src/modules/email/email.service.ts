import { Injectable, Logger } from '@nestjs/common';

export interface SendEmailOptions {
  to: string;
  subject: string;
  text: string;
}

/**
 * No real email provider is configured for this project yet (no SMTP/API
 * key). This logs the email instead of sending it, so the invitation flow
 * is fully testable without one. Swap this for a real provider (Resend,
 * SES, etc.) behind the same `send` method when credentials exist.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  async send({ to, subject, text }: SendEmailOptions): Promise<void> {
    this.logger.log(`Email to ${to} — ${subject}\n${text}`);
  }
}
