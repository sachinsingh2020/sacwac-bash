import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../../lib/db';
import VerificationToken from '../../../../../models/VerificationToken';
import { sendEmail } from '../../../../../lib/email';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const { email } = await request.json();
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Generate 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await connectToDatabase();

    // Delete any old OTPs for this email
    await VerificationToken.deleteMany({ email: cleanEmail });

    // Store new code
    await VerificationToken.create({
      email: cleanEmail,
      code,
      expiresAt,
    });

    // Send email using Nodemailer
    const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 32px 24px; background: #ffffff; border-radius: 20px; border: 1px solid #f2e1e5;">
        <div style="text-align: center; margin-bottom: 24px;">
          <span style="font-size: 36px;">✨</span>
          <h1 style="color: #4a2835; font-size: 24px; margin: 8px 0 4px; font-weight: 700;">Magic Moments</h1>
          <p style="color: #8b6b77; font-size: 14px; margin: 0;">Your Verification Code</p>
        </div>
        <p style="color: #442a34; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
          Use the 6-digit code below to sign in and unlock your special member discount (₹49 celebration link):
        </p>
        <div style="background: #fff5f7; border: 2px dashed #f5a9bc; border-radius: 14px; padding: 20px; text-align: center; margin-bottom: 24px;">
          <span style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #d95775; font-family: monospace;">${code}</span>
        </div>
        <p style="color: #927581; font-size: 12px; line-height: 1.5; margin: 0; text-align: center;">
          This code is valid for 10 minutes. If you didn't request this code, you can safely ignore this email.
        </p>
      </div>
    `;

    await sendEmail({
      to: cleanEmail,
      subject: `Your Magic Moments verification code: ${code}`,
      html: emailHtml,
    });

    return NextResponse.json({ success: true, message: 'Verification code sent to your email.' });
  } catch (error) {
    console.error('Send OTP error:', error);
    return NextResponse.json({ error: error.message || 'Failed to send verification code.' }, { status: 500 });
  }
}
