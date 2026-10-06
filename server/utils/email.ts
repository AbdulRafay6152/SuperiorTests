// ============================================================
// GGDC Tests — Email Utility (Nodemailer)
// ============================================================

import nodemailer from 'nodemailer';
import { config } from '../config';

const transporter = nodemailer.createTransport({
  host: config.smtpHost,
  port: config.smtpPort,
  secure: config.smtpPort === 465,
  auth: config.smtpUser ? {
    user: config.smtpUser,
    pass: config.smtpPass,
  } : undefined,
});

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  // In development without SMTP config, just log
  if (!config.smtpUser) {
    console.log(`[EMAIL] To: ${options.to} | Subject: ${options.subject}`);
    return;
  }

  try {
    await transporter.sendMail({
      from: config.smtpFrom,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, ''),
    });
  } catch (err) {
    console.error('Email send error:', err);
    // Don't throw — email failures shouldn't break the app
  }
}
