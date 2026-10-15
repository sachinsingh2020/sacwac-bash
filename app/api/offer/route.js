import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../lib/db';
import AbandonedTemplate from '../../../models/AbandonedTemplate';
import BirthdayPage from '../../../models/BirthdayPage';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing template ID parameter.' }, { status: 400 });
    }

    await connectToDatabase();

    const template = await AbandonedTemplate.findOne({ templateId: id }).lean();

    if (!template) {
      return NextResponse.json({ error: 'Celebration template not found.' }, { status: 404 });
    }

    let liveSlug = null;
    if (template.isConverted) {
      const page = await BirthdayPage.findOne({
        $or: [
          { name: template.name, userEmail: template.userEmail },
          { orderId: { $exists: true, $ne: '' }, name: template.name }
        ]
      }).sort({ createdAt: -1 }).lean();
      if (page) {
        liveSlug = page.slug;
      }
    }

    return NextResponse.json({
      templateId: template.templateId,
      name: template.name || 'Someone Special',
      nickname: template.nickname || '',
      dob: template.dob || '',
      age: template.age || '',
      date: template.date || template.dob || '',
      message: template.message || '',
      reasons: Array.isArray(template.reasons) ? template.reasons : [],
      photo: template.photo || '',
      photoPublicId: template.photoPublicId || '',
      gallery: Array.isArray(template.gallery) ? template.gallery : [],
      galleryPublicIds: Array.isArray(template.galleryPublicIds) ? template.galleryPublicIds : [],
      userEmail: template.userEmail || '',
      isConverted: Boolean(template.isConverted),
      liveSlug,
      createdAt: template.createdAt,
    });
  } catch (error) {
    console.error('Failed to fetch offer template:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve template details.' },
      { status: 500 }
    );
  }
}
