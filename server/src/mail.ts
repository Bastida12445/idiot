import nodemailer from 'nodemailer';
import { config, mailConfigured } from './config.js';

export async function notifyContact(sender: { full_name: string; email: string; subject: string; message: string }) {
  if (!mailConfigured) throw new Error('Email is not configured. Set GMAIL_USER, GMAIL_APP_PASSWORD, and NOTIFICATION_EMAIL.');
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com', port: 465, secure: true,
    auth: { user: config.gmailUser, pass: config.gmailPassword },
  });
  await transporter.sendMail({
    from: `"Portfolio contact" <${config.gmailUser}>`,
    to: config.notificationEmail,
    replyTo: sender.email,
    subject: `[Website inquiry] ${sender.subject}`,
    text: `From: ${sender.full_name} <${sender.email}>\n\n${sender.message}`,
  });
}
