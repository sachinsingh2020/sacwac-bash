import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../lib/db';
import User from '../../../../models/User';
import { createToken, verifyToken } from '../../../../lib/jwt';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const { credential } = await request.json();
    if (!credential) {
      return NextResponse.json({ error: 'Missing Google credential.' }, { status: 400 });
    }

    // Verify token with Google TokenInfo API
    const googleRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
    if (!googleRes.ok) {
      return NextResponse.json({ error: 'Invalid Google credential.' }, { status: 401 });
    }

    const payload = await googleRes.json();
    const { email, name, picture, sub } = payload;

    if (!email) {
      return NextResponse.json({ error: 'Email not provided by Google.' }, { status: 400 });
    }

    await connectToDatabase();

    let user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      user = await User.create({
        email: email.toLowerCase(),
        name: name || '',
        picture: picture || '',
        provider: 'google',
        lastLoginAt: new Date(),
      });
    } else {
      user.name = name || user.name;
      user.picture = picture || user.picture;
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
    console.error('Google auth error:', error);
    return NextResponse.json({ error: error.message || 'Authentication failed.' }, { status: 500 });
  }
}
