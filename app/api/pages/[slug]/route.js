import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../lib/db';
import BirthdayPage from '../../../../models/BirthdayPage';
import { cloudinaryPublicIdFromUrl, deleteCloudinaryAsset } from '../../../../lib/cloudinary';
import { verifyAdminAuth } from '../../../../lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  try {
    await connectToDatabase();
    const page = await BirthdayPage.findOne({
      slug: params.slug,
      $or: [{ isPaid: true }, { paymentId: { $regex: /^pay_/ } }],
    }).lean();

    if (!page) {
      return NextResponse.json({ error: 'Valid celebration page not found.' }, { status: 404 });
    }

    return NextResponse.json({ ...page, id: page.slug, _id: undefined });
  } catch (error) {
    console.error('Unable to load birthday page:', error);
    return NextResponse.json({ error: 'Database is unavailable.' }, { status: 503 });
  }
}

export async function PATCH(request, { params }) {
  try {
    if (!verifyAdminAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required.' }, { status: 401 });
    }

    const body = await request.json();
    await connectToDatabase();
    const page = await BirthdayPage.findOneAndUpdate({ slug: params.slug }, {
      name: body.name?.trim(),
      nickname: body.nickname?.trim() || '',
      dob: body.dob?.trim() || '',
      age: body.age?.toString().trim() || '',
      date: body.date?.trim() || body.dob?.trim() || new Date().toISOString().split('T')[0],
      message: body.message?.trim(),
      reasons: Array.isArray(body.reasons)
        ? body.reasons.map((r) => r?.toString().trim()).filter(Boolean).slice(0, 5)
        : [],
      photo: body.photo || '',
      photoPublicId: body.photoPublicId || '',
      gallery: Array.isArray(body.gallery) ? body.gallery.slice(0, 17) : [],
      galleryPublicIds: Array.isArray(body.galleryPublicIds) ? body.galleryPublicIds.slice(0, 17) : []
    }, { new: true, runValidators: true }).lean();
    if (!page) return NextResponse.json({ error: 'Birthday page not found.' }, { status: 404 });
    return NextResponse.json({ ...page, id: page.slug });
  } catch (error) {
    console.error('Unable to update birthday page:', error);
    return NextResponse.json({ error: 'Unable to update birthday page.' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    if (!verifyAdminAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required.' }, { status: 401 });
    }

    await connectToDatabase();
    const page = await BirthdayPage.findOne({ slug: params.slug }).lean();
    if (!page) return NextResponse.json({ error: 'Birthday page not found.' }, { status: 404 });
    const publicIds = [
      page.photoPublicId || cloudinaryPublicIdFromUrl(page.photo),
      ...(page.galleryPublicIds || []),
      ...(page.gallery || []).map((url) => cloudinaryPublicIdFromUrl(url))
    ].filter(Boolean).filter((id, index, ids) => ids.indexOf(id) === index);
    await Promise.all(publicIds.map((publicId) => deleteCloudinaryAsset(publicId)));
    const result = await BirthdayPage.deleteOne({ _id: page._id });
    if (!result.deletedCount) return NextResponse.json({ error: 'Birthday page not found.' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unable to delete birthday page:', error);
    return NextResponse.json({ error: 'Unable to delete birthday page.' }, { status: 500 });
  }
}
