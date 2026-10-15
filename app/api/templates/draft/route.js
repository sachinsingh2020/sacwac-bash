import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../lib/db';
import AbandonedTemplate from '../../../../models/AbandonedTemplate';
import { extractClientIp } from '../../../../lib/geoAndAgent';
import { verifyToken } from '../../../../lib/jwt';
import { verifyAdminAuth } from '../../../../lib/adminAuth';
import { deleteRecordCloudinaryAssets } from '../../../../lib/cloudinary';

export const dynamic = 'force-dynamic';

// GET: Admin fetches abandoned draft templates
export async function GET(request) {
  try {
    if (!verifyAdminAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter'); // 'all' | 'loggedin'

    await connectToDatabase();

    const query = { isConverted: false };
    if (filter === 'loggedin') {
      query.userEmail = { $exists: true, $ne: '' };
    }

    const templates = await AbandonedTemplate.find(query)
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    return NextResponse.json(templates);
  } catch (error) {
    console.error('Failed to load abandoned templates:', error);
    return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
  }
}

// POST: Save draft template when user designs celebration or tests preview
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { templateId, formData } = body;

    if (!templateId || !formData) {
      return NextResponse.json({ error: 'Missing template data' }, { status: 400 });
    }

    const clientIp = extractClientIp(request);
    const userAgent = request.headers.get('user-agent') || '';

    let userEmail = body.userEmail || '';
    if (!userEmail) {
      const token = request.cookies.get('user_token')?.value;
      if (token) {
        const decoded = verifyToken(token);
        if (decoded && decoded.email) userEmail = decoded.email;
      }
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

    // Auto-trim: Enforce maximum of 200 non-converted draft records in the database.
    // If records exceed 200, delete oldest records from below along with their Cloudinary assets.
    try {
      const totalCount = await AbandonedTemplate.countDocuments({ isConverted: false });
      if (totalCount > 200) {
        const excessCount = totalCount - 200;
        const excessOldest = await AbandonedTemplate.find({ isConverted: false })
          .sort({ createdAt: 1 }) // oldest records first (from bottom)
          .limit(excessCount)
          .lean();

        for (const draft of excessOldest) {
          await deleteRecordCloudinaryAssets(draft);
        }

        const idsToDelete = excessOldest.map((d) => d._id);
        await AbandonedTemplate.deleteMany({ _id: { $in: idsToDelete } });
      }
    } catch (trimErr) {
      console.warn('Auto-trimming abandoned templates encountered error:', trimErr.message);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to save abandoned template draft:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
