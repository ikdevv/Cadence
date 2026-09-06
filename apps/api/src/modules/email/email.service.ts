import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, type Transporter } from 'nodemailer';

export interface SendEmailOptions {
  to: string;
  subject: string;
  text: string;
}

/**
 * Sends through SMTP — Mailpit in local dev (docker-compose service
 * `mailpit`, no auth, inbox UI at http://localhost:8025), a real provider's
 * SMTP endpoint (Postmark, SES, etc.) in every other environment. Nothing
 * outside this class knows or cares which one it's talking to.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter: Transporter;
  private readonly from: string;

  constructor(private readonly config: ConfigService) {
    this.from = this.config.get<string>('SMTP_FROM') ?? 'Cadence <no-reply@cadence.local>';
    this.transporter = createTransport({
      host: this.config.get<string>('SMTP_HOST') ?? 'localhost',
      port: this.config.get<number>('SMTP_PORT') ?? 1025,
      // Mailpit and most local SMTP catchers don't speak TLS.
      secure: this.config.get<string>('SMTP_SECURE') === 'true',
      auth:
        this.config.get<string>('SMTP_USER') && this.config.get<string>('SMTP_PASS')
          ? {
              user: this.config.get<string>('SMTP_USER'),
              pass: this.config.get<string>('SMTP_PASS'),
            }
          : undefined,
    });
  }

  async send({ to, subject, text }: SendEmailOptions): Promise<void> {
    try {
      await this.transporter.sendMail({ from: this.from, to, subject, text });
    } catch (error) {
      // A down mail catcher shouldn't be able to break invitations/etc. in
      // local dev — log it loudly and move on, same as every other
      // best-effort side-effect in this app (see EventEmitterModule note in
      // app.module.ts).
      const detail = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to send email to ${to} — ${subject}: ${detail}`);
    }
  }
}
