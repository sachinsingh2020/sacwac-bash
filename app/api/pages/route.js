import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../lib/db';
import BirthdayPage from '../../../models/BirthdayPage';

function cleanPayload(body) {
  return {
    name: body.name?.trim(),
    nickname: body.nickname?.trim() || '',
    age: body.age?.toString().trim() || '',
    date: body.date,
    message: body.message?.trim(),
    photo: body.photo || '',
    photoPublicId: body.photoPublicId || '',
    gallery: Array.isArray(body.gallery) ? body.gallery.slice(0, 10) : [],
    galleryPublicIds: Array.isArray(body.galleryPublicIds) ? body.galleryPublicIds.slice(0, 10) : []
  };
}

export async function GET() {
  try {
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
    const body = await request.json();
    const data = cleanPayload(body);
    if (!data.name || !data.date || !data.message) return NextResponse.json({ error: 'Name, date, and message are required.' }, { status: 400 });
    await connectToDatabase();
    const slug = `${data.name.toLowerCase().replace(/[^a-z0-9]+/g, '')}${Math.floor(1000 + Math.random() * 8999)}`;
    const page = await BirthdayPage.create({ ...data, slug });
    return NextResponse.json({ ...page.toObject(), id: page.slug }, { status: 201 });
  } catch (error) {
    console.error('Unable to create birthday page:', error);
    return NextResponse.json({ error: 'Unable to save birthday page.' }, { status: 500 });
  }
}
