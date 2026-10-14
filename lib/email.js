import nodemailer from 'nodemailer';

let transporter = null;

export function getEmailTransporter() {
  if (!transporter) {
    const user = (process.env.SMTP_USER || '').trim();
    const pass = (process.env.SMTP_PASS || '').trim();

    transporter = nodemailer.createTransport({
      service: process.env.SMTP_SERVICE || 'gmail',
      auth: {
        user,
        pass,
      },
    });
  }
  return transporter;
}

export async function sendEmail({ to, subject, html, text }) {
  const from = process.env.SMTP_FROM || `"Magic Moments" <${process.env.SMTP_USER}>`;
  const transport = getEmailTransporter();

  return transport.sendMail({
    from,
    to,
    subject,
    html,
    text: text || html.replace(/<[^>]+>/g, ' '),
  });
}
