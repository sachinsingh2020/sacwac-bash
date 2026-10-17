import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../lib/db';
import BirthdayPage from '../../../models/BirthdayPage';
import { verifyAdminAuth } from '../../../lib/adminAuth';

function cleanPayload(body) {
  const dob = body.dob?.toString().trim() || '';
  const date = body.date?.toString().trim() || dob || new Date().toISOString().split('T')[0];

  return {
    name: body.name?.trim(),
    nickname: body.nickname?.trim() || '',
    sender: body.sender?.trim() || '',
    dob,
    age: body.age?.toString().trim() || '',
    date,
    message: body.message?.trim(),
    reasons: Array.isArray(body.reasons)
      ? body.reasons.map((r) => r?.toString().trim()).filter(Boolean).slice(0, 5)
      : [],
    photo: body.photo || '',
    photoPublicId: body.photoPublicId || '',
    gallery: Array.isArray(body.gallery) ? body.gallery.slice(0, 17) : [],
    galleryPublicIds: Array.isArray(body.galleryPublicIds) ? body.galleryPublicIds.slice(0, 17) : []
  };
}

export async function GET(request) {
  try {
    if (!verifyAdminAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required.' }, { status: 401 });
    }

    await connectToDatabase();
    const pages = await BirthdayPage.find().sort({ createdAt: -1 }).lean();
    return NextResponse.json(pages.map((page) => ({ ...page, id: page.slug, _id: undefined })));
  } catch (error) {
    console.error('Unable to load birthday pages:', error);
    return NextResponse.json({ error: 'Database is unavailable.' }, { status: 503 });
  }
}

export async function POST(request) {
  try {
    if (!verifyAdminAuth(request)) {
      return NextResponse.json(
        { error: 'Unauthorized: Direct celebration creation is restricted to verified checkout payments.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const data = cleanPayload(body);
    if (!data.name) data.name = 'Celebration';
    if (!data.message) data.message = 'Happy Birthday! Wishing you joy, love, and happiness on your special day!';

    await connectToDatabase();
    const baseSlug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '') || 'birthday';
    let slug = `${baseSlug}${Math.floor(1000 + Math.random() * 8999)}`;
    
    // Ensure slug is unique
    let attempts = 0;
    while (await BirthdayPage.exists({ slug }) && attempts < 5) {
      slug = `${baseSlug}${Math.floor(1000 + Math.random() * 8999)}`;
      attempts++;
    }

    const page = await BirthdayPage.create({ ...data, slug });
    return NextResponse.json({ ...page.toObject(), id: page.slug, slug: page.slug }, { status: 201 });
  } catch (error) {
    console.error('Unable to create birthday page:', error);
    return NextResponse.json({ error: error.message || 'Unable to save birthday page.' }, { status: 500 });
  }
}
