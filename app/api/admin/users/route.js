import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../lib/db';
import User from '../../../../models/User';
import { verifyAdminAuth } from '../../../../lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    if (!verifyAdminAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required.' }, { status: 401 });
    }

    await connectToDatabase();
    const users = await User.find().sort({ createdAt: -1 }).lean();

    return NextResponse.json(
      users.map((u) => ({
        id: u._id.toString(),
        email: u.email,
        name: u.name,
        picture: u.picture,
        provider: u.provider,
        createdAt: u.createdAt,
        lastLoginAt: u.lastLoginAt,
      }))
    );
  } catch (error) {
    console.error('Failed to load users list:', error);
    return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
  }
}
