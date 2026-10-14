import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../../lib/db';
import VerificationToken from '../../../../../models/VerificationToken';
import User from '../../../../../models/User';
import { createToken } from '../../../../../lib/jwt';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const { email, code } = await request.json();
    if (!email || !code) {
      return NextResponse.json({ error: 'Email and verification code are required.' }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanCode = code.toString().trim();

    await connectToDatabase();

    const record = await VerificationToken.findOne({
      email: cleanEmail,
      code: cleanCode,
      expiresAt: { $gt: new Date() },
    });

    if (!record) {
      return NextResponse.json({ error: 'Invalid or expired verification code.' }, { status: 400 });
    }

    // Code is valid -> delete it so it cannot be reused
    await VerificationToken.deleteOne({ _id: record._id });

    // Find or create User
    let user = await User.findOne({ email: cleanEmail });
    if (!user) {
      user = await User.create({
        email: cleanEmail,
        name: cleanEmail.split('@')[0],
        provider: 'email',
        lastLoginAt: new Date(),
      });
    } else {
      user.lastLoginAt = new Date();
      await user.save();
    }

    const token = createToken({
      userId: user._id.toString(),
      email: user.email,
      name: user.name,
      picture: user.picture,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        picture: user.picture,
      },
      token,
    });

    response.cookies.set('user_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Verify OTP error:', error);
    return NextResponse.json({ error: error.message || 'Verification failed.' }, { status: 500 });
  }
}
