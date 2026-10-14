import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../lib/db';
import AbandonedTemplate from '../../../../models/AbandonedTemplate';
import { extractClientIp } from '../../../../lib/geoAndAgent';
import { verifyToken } from '../../../../lib/jwt';
import { verifyAdminAuth } from '../../../../lib/adminAuth';

export const dynamic = 'force-dynamic';

// GET: Admin fetches "people who create but didn't buy"
export async function GET(request) {
  try {
    if (!verifyAdminAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required.' }, { status: 401 });
    }

    await connectToDatabase();
    const templates = await AbandonedTemplate.find({ isConverted: false })
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    return NextResponse.json(templates);
  } catch (error) {
    console.error('Failed to load abandoned templates:', error);
    return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
  }
}

// POST: Save draft template when user reaches preview without buying
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { templateId, formData } = body;

    if (!templateId || !formData) {
      return NextResponse.json({ error: 'Missing template data' }, { status: 400 });
    }

    const clientIp = extractClientIp(request);
    const userAgent = request.headers.get('user-agent') || '';

    let userEmail = '';
    const token = request.cookies.get('user_token')?.value;
    if (token) {
      const decoded = verifyToken(token);
      if (decoded && decoded.email) userEmail = decoded.email;
    }

    await connectToDatabase();

    const cleanReasons = Array.isArray(formData.reasons)
      ? formData.reasons.map((r) => r?.toString().trim()).filter(Boolean).slice(0, 5)
      : [];

    await AbandonedTemplate.findOneAndUpdate(
      { templateId },
      {
        templateId,
        name: formData.name?.trim() || 'Someone Special',
        nickname: formData.nickname?.trim() || '',
        dob: formData.dob || '',
        age: formData.age?.toString().trim() || '',
        date: formData.dob || new Date().toISOString().split('T')[0],
        message: formData.message?.trim() || '',
        reasons: cleanReasons,
        photo: formData.photo || '',
        photoPublicId: formData.photoPublicId || '',
        gallery: Array.isArray(formData.gallery) ? formData.gallery.slice(0, 17) : [],
        galleryPublicIds: Array.isArray(formData.galleryPublicIds) ? formData.galleryPublicIds.slice(0, 17) : [],
        userEmail: userEmail || undefined,
        clientIp,
        userAgent,
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to save abandoned template draft:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
