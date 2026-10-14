import { NextResponse } from 'next/server';
import { verifyToken } from '../../../../lib/jwt';
import { connectToDatabase } from '../../../../lib/db';
import User from '../../../../models/User';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    let token = request.cookies.get('user_token')?.value;
    const authHeader = request.headers.get('authorization');
    if (!token && authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    if (!token) {
      return NextResponse.json({ authenticated: false, user: null });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ authenticated: false, user: null });
    }

    await connectToDatabase();
    const user = await User.findById(decoded.userId).lean();
    if (!user) {
      return NextResponse.json({ authenticated: false, user: null });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        picture: user.picture,
        provider: user.provider,
      },
    });
  } catch (error) {
    return NextResponse.json({ authenticated: false, user: null });
  }
}

export async function POST(request) {
  // Logout
  const response = NextResponse.json({ success: true });
  response.cookies.delete('user_token');
  return response;
}
