import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../lib/db';
import BirthdayPage from '../../../../models/BirthdayPage';
import AbandonedTemplate from '../../../../models/AbandonedTemplate';
import { verifyAdminAuth } from '../../../../lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    if (!verifyAdminAuth(request)) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin access required.' },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { templateId } = body;

    if (!templateId) {
      return NextResponse.json(
        { error: 'Missing templateId parameter.' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const isObjectId = typeof templateId === 'string' && templateId.length === 24 && /^[0-9a-fA-F]{24}$/.test(templateId);

    const template = await AbandonedTemplate.findOne({
      $or: [
        { templateId },
        ...(isObjectId ? [{ _id: templateId }] : []),
      ],
    });

    if (!template) {
      return NextResponse.json(
        { error: 'Draft template not found.' },
        { status: 404 }
      );
    }

    // Check if celebration page was already created for this template
    if (template.convertedSlug) {
      const existingPage = await BirthdayPage.findOne({ slug: template.convertedSlug }).lean();
      if (existingPage) {
        return NextResponse.json({
          success: true,
          slug: existingPage.slug,
          page: existingPage,
          alreadyConverted: true,
          message: 'Template was already converted to a live link.',
        });
      }
    }

    // Generate unique slug
    const baseSlug = (template.name || 'birthday').toLowerCase().replace(/[^a-z0-9]+/g, '') || 'birthday';
    let slug = `${baseSlug}${Math.floor(1000 + Math.random() * 8999)}`;
    let attempts = 0;
    while (await BirthdayPage.exists({ slug }) && attempts < 5) {
      slug = `${baseSlug}${Math.floor(1000 + Math.random() * 8999)}`;
      attempts++;
    }

    // Create live celebration page without payment
    const newPage = await BirthdayPage.create({
      slug,
      name: template.name || 'Someone Special',
      nickname: template.nickname || '',
      sender: template.sender || '',
      dob: template.dob || '',
      age: template.age ? template.age.toString().trim() : '',
      date: template.date || template.dob || new Date().toISOString().split('T')[0],
      message: template.message || 'Wishing you a magical and unforgettable birthday filled with joy and love!',
      reasons: Array.isArray(template.reasons) ? template.reasons : [],
      photo: template.photo || '',
      photoPublicId: template.photoPublicId || '',
      gallery: Array.isArray(template.gallery) ? template.gallery : [],
      galleryPublicIds: Array.isArray(template.galleryPublicIds) ? template.galleryPublicIds : [],
      isPaid: true,
      convertedByAdmin: true,
      paymentId: 'admin_converted',
      orderId: 'admin_manual',
      amountPaid: 0,
      userEmail: template.userEmail || '',
    });

    // Mark AbandonedTemplate as converted
    template.isConverted = true;
    template.convertedSlug = slug;
    template.convertedAt = new Date();
    await template.save();

    return NextResponse.json({
      success: true,
      slug,
      page: newPage.toObject(),
      message: `Successfully converted ${template.name}'s template into live link: /${slug}`,
    });
  } catch (error) {
    console.error('Error converting template to live link:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to convert template into live link.' },
      { status: 500 }
    );
  }
}
