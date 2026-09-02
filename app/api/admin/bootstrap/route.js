import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectToDatabase } from '../../../../lib/db';
import Admin from '../../../../models/Admin';

export async function POST(request) {
  if (!process.env.ADMIN_BOOTSTRAP_SECRET || request.headers.get('x-bootstrap-secret') !== process.env.ADMIN_BOOTSTRAP_SECRET) {
    return NextResponse.json({ error: 'Bootstrap access denied.' }, { status: 403 });
  }
  const { email, password } = await request.json();
  if (!email || !password || password.length < 8) return NextResponse.json({ error: 'Email and a password of at least 8 characters are required.' }, { status: 400 });
  await connectToDatabase();
  const exists = await Admin.exists({ email: email.toLowerCase() });
  if (exists) return NextResponse.json({ error: 'Admin already exists.' }, { status: 409 });
  const admin = await Admin.create({ email, passwordHash: await bcrypt.hash(password, 12) });
  return NextResponse.json({ id: admin.id, email: admin.email, role: admin.role }, { status: 201 });
}
