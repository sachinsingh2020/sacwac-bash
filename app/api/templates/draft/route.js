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

    // Sort by lastVisitedAt so users actively visiting/creating jump straight to the top of the list
    const templates = await AbandonedTemplate.find(query)
      .sort({ lastVisitedAt: -1, updatedAt: -1, createdAt: -1 })
      .limit(200)
      .lean();

    return NextResponse.json(templates);
  } catch (error) {
    console.error('Failed to load abandoned templates:', error);
    return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
  }
}

function escapeRegex(string) {
  return string.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
}

// POST: Save draft template when user designs celebration or tests preview
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { templateId, formData, visitorId = '' } = body;

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

    const now = new Date();
    const cleanVisitorId = (visitorId || '').trim();
    const cleanSender = (formData.sender || '').trim();
    const cleanName = (formData.name || '').trim();
    const cleanEmail = (userEmail || '').trim().toLowerCase();

    // Search for an existing non-converted draft belonging to this same person:
    // 1) By persistent device/browser visitorId (from localStorage)
    // 2) By userEmail if logged in
    // 3) By current templateId
    // 4) By sender name + IP address
    // 5) By celebrant name + IP address (if celebrant name is meaningful)
    const matchQueries = [];

    if (cleanVisitorId) {
      matchQueries.push({ visitorId: cleanVisitorId, isConverted: false });
    }
    if (cleanEmail) {
      matchQueries.push({ userEmail: cleanEmail, isConverted: false });
    }
    if (templateId) {
      matchQueries.push({ templateId, isConverted: false });
    }
    if (cleanSender && clientIp && clientIp !== '127.0.0.1' && clientIp !== '::1') {
      matchQueries.push({
        sender: { $regex: new RegExp(`^${escapeRegex(cleanSender)}$`, 'i') },
        clientIp,
        isConverted: false,
      });
    }
    if (cleanName && cleanName.toLowerCase() !== 'someone special' && clientIp && clientIp !== '127.0.0.1' && clientIp !== '::1') {
      matchQueries.push({
        name: { $regex: new RegExp(`^${escapeRegex(cleanName)}$`, 'i') },
        clientIp,
        isConverted: false,
      });
    }

    let existingRecord = null;
    if (matchQueries.length > 0) {
      existingRecord = await AbandonedTemplate.findOne({ $or: matchQueries })
        .sort({ lastVisitedAt: -1, updatedAt: -1, createdAt: -1 });
    }

    const currentSnapshot = {
      templateId,
      name: cleanName || 'Someone Special',
      nickname: formData.nickname?.trim() || '',
      sender: cleanSender,
      dob: formData.dob || '',
      age: formData.age?.toString().trim() || '',
      date: formData.dob || now.toISOString().split('T')[0],
      message: formData.message?.trim() || '',
      photo: formData.photo || '',
      photoPublicId: formData.photoPublicId || '',
      gallery: Array.isArray(formData.gallery) ? formData.gallery.slice(0, 17) : [],
      galleryPublicIds: Array.isArray(formData.galleryPublicIds) ? formData.galleryPublicIds.slice(0, 17) : [],
      reasons: cleanReasons,
      galleryCount: Array.isArray(formData.gallery) ? formData.gallery.length : 0,
      reasonsCount: cleanReasons.length,
      createdAt: now,
      clientIp,
      userAgent,
    };

    if (existingRecord) {
      // User is returning and updating/creating: do NOT duplicate!
      const lastVisitTime = existingRecord.lastVisitedAt || existingRecord.updatedAt || existingRecord.createdAt;
      const timeDiffMinutes = (now.getTime() - new Date(lastVisitTime).getTime()) / (1000 * 60);

      const isDifferentTemplate = existingRecord.templateId && existingRecord.templateId !== templateId;
      const isRevisitAfterPause = timeDiffMinutes >= 10;
      const isDifferentCelebrant =
        cleanName &&
        existingRecord.name &&
        cleanName.toLowerCase() !== existingRecord.name.toLowerCase() &&
        cleanName.toLowerCase() !== 'someone special';

      const isNewCreation = isDifferentTemplate || isRevisitAfterPause || isDifferentCelebrant;

      // Ensure creationHistory array is initialized with previous data if empty
      if (!Array.isArray(existingRecord.creationHistory) || existingRecord.creationHistory.length === 0) {
        existingRecord.creationHistory = [{
          templateId: existingRecord.templateId,
          name: existingRecord.name,
          nickname: existingRecord.nickname || '',
          sender: existingRecord.sender || '',
          dob: existingRecord.dob || existingRecord.date || '',
          age: existingRecord.age || '',
          date: existingRecord.date || existingRecord.dob || '',
          message: existingRecord.message || '',
          photo: existingRecord.photo || '',
          photoPublicId: existingRecord.photoPublicId || '',
          gallery: existingRecord.gallery || [],
          galleryPublicIds: existingRecord.galleryPublicIds || [],
          reasons: existingRecord.reasons || [],
          galleryCount: (existingRecord.gallery || []).length,
          reasonsCount: (existingRecord.reasons || []).length,
          createdAt: existingRecord.createdAt || lastVisitTime || now,
          clientIp: existingRecord.clientIp || clientIp,
          userAgent: existingRecord.userAgent || userAgent,
        }];
      }

      if (isNewCreation) {
        existingRecord.visitCount = (existingRecord.visitCount || 1) + 1;
        existingRecord.creationHistory.push(currentSnapshot);
      } else {
        // Update the current in-progress creation entry in creationHistory
        if (existingRecord.creationHistory.length > 0) {
          const lastIdx = existingRecord.creationHistory.length - 1;
          const prevEntry = existingRecord.creationHistory[lastIdx];
          existingRecord.creationHistory[lastIdx] = {
            ...(prevEntry.toObject ? prevEntry.toObject() : prevEntry),
            ...currentSnapshot,
            createdAt: prevEntry.createdAt || now,
          };
        }
      }

      // Update primary document attributes with latest data
      existingRecord.templateId = templateId;
      if (cleanName) existingRecord.name = cleanName;
      if (formData.nickname !== undefined) existingRecord.nickname = formData.nickname.trim();
      if (cleanSender) existingRecord.sender = cleanSender;
      if (formData.dob !== undefined) existingRecord.dob = formData.dob;
      if (formData.age !== undefined) existingRecord.age = formData.age.toString().trim();
      if (formData.dob) existingRecord.date = formData.dob;
      if (formData.message !== undefined) existingRecord.message = formData.message.trim();
      if (cleanReasons.length > 0) existingRecord.reasons = cleanReasons;
      if (formData.photo) {
        existingRecord.photo = formData.photo;
        existingRecord.photoPublicId = formData.photoPublicId || existingRecord.photoPublicId;
      }
      if (Array.isArray(formData.gallery) && formData.gallery.length > 0) {
        existingRecord.gallery = formData.gallery.slice(0, 17);
        existingRecord.galleryPublicIds = (formData.galleryPublicIds || []).slice(0, 17);
      }
      if (cleanEmail) existingRecord.userEmail = cleanEmail;
      if (cleanVisitorId) existingRecord.visitorId = cleanVisitorId;
      existingRecord.clientIp = clientIp;
      existingRecord.userAgent = userAgent;

      // Update lastVisitedAt to now! (This puts this returning user at the top of the list!)
      existingRecord.lastVisitedAt = now;

      await existingRecord.save();
    } else {
      // First-time creator: Create new document with history initialized
      await AbandonedTemplate.create({
        templateId,
        visitorId: cleanVisitorId,
        name: cleanName || 'Someone Special',
        nickname: formData.nickname?.trim() || '',
        sender: cleanSender,
        dob: formData.dob || '',
        age: formData.age?.toString().trim() || '',
        date: formData.dob || now.toISOString().split('T')[0],
        message: formData.message?.trim() || '',
        reasons: cleanReasons,
        photo: formData.photo || '',
        photoPublicId: formData.photoPublicId || '',
        gallery: Array.isArray(formData.gallery) ? formData.gallery.slice(0, 17) : [],
        galleryPublicIds: Array.isArray(formData.galleryPublicIds) ? formData.galleryPublicIds.slice(0, 17) : [],
        userEmail: cleanEmail || undefined,
        clientIp,
        userAgent,
        visitCount: 1,
        lastVisitedAt: now,
        creationHistory: [currentSnapshot],
      });
    }

    // Auto-trim: Enforce maximum of 200 non-converted draft records in the database.
    try {
      const totalCount = await AbandonedTemplate.countDocuments({ isConverted: false });
      if (totalCount > 200) {
        const excessCount = totalCount - 200;
        const excessOldest = await AbandonedTemplate.find({ isConverted: false })
          .sort({ lastVisitedAt: 1, createdAt: 1 }) // least-recently active records first
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
