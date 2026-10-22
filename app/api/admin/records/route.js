import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../lib/db';
import BirthdayPage from '../../../../models/BirthdayPage';
import AbandonedTemplate from '../../../../models/AbandonedTemplate';
import User from '../../../../models/User';
import VisitorLog from '../../../../models/VisitorLog';
import { verifyAdminAuth } from '../../../../lib/adminAuth';
import { deleteRecordCloudinaryAssets } from '../../../../lib/cloudinary';

export const dynamic = 'force-dynamic';

export async function DELETE(request) {
  try {
    if (!verifyAdminAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized: Admin privileges required.' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { type, id, slug } = body;

    if (!type || (!id && !slug)) {
      return NextResponse.json({ error: 'Missing record type or identifier.' }, { status: 400 });
    }

    await connectToDatabase();

    // 1. DELETE BUYER / PAID BIRTHDAY PAGE
    if (type === 'buyer') {
      const isObjectId = typeof id === 'string' && id.length === 24 && /^[0-9a-fA-F]{24}$/.test(id);
      const query = [];
      if (isObjectId) query.push({ _id: id });
      if (id && !isObjectId) query.push({ slug: id });
      if (slug) {
        const cleanSlug = slug.trim().replace(/^\//, '');
        query.push({ slug: cleanSlug });
      }

      if (query.length === 0) {
        return NextResponse.json({ error: 'Missing valid identifier for buyer page.' }, { status: 400 });
      }

      const page = await BirthdayPage.findOne({ $or: query });
      if (!page) {
        return NextResponse.json({ error: 'Buyer page not found.' }, { status: 404 });
      }

      // Destroy all Cloudinary portrait and gallery images
      await deleteRecordCloudinaryAssets(page);

      // Delete the record from MongoDB
      await BirthdayPage.findByIdAndDelete(page._id);

      // Clean up visitor logs for this link
      if (page.slug) {
        await VisitorLog.deleteMany({ slug: page.slug });
      }

      // If this page was converted from an abandoned template, clean that up too
      if (page.slug) {
        await AbandonedTemplate.deleteMany({ convertedSlug: page.slug });
      }

      return NextResponse.json({
        success: true,
        message: `Celebration for "${page.name}" and associated Cloudinary assets were permanently deleted.`,
      });
    }

    // 2. DELETE ABANDONED DRAFT TEMPLATE
    if (type === 'abandoned') {
      const query = [];
      if (id) query.push({ _id: id });
      if (id) query.push({ templateId: id });

      const template = await AbandonedTemplate.findOne({ $or: query });
      if (!template) {
        return NextResponse.json({ error: 'Draft template not found.' }, { status: 404 });
      }

      // Destroy all Cloudinary portrait and gallery images
      await deleteRecordCloudinaryAssets(template);

      // Delete draft from MongoDB
      await AbandonedTemplate.findByIdAndDelete(template._id);

      return NextResponse.json({
        success: true,
        message: `Draft template for "${template.name}" and Cloudinary assets were permanently deleted.`,
      });
    }

    // 3. DELETE LOGGED-IN USER
    if (type === 'user') {
      const query = [];
      if (id) query.push({ _id: id });
      if (id) query.push({ email: id.toLowerCase() });

      const user = await User.findOne({ $or: query });
      if (!user) {
        return NextResponse.json({ error: 'User account not found.' }, { status: 404 });
      }

      await User.findByIdAndDelete(user._id);

      return NextResponse.json({
        success: true,
        message: `User account "${user.email}" was permanently deleted.`,
      });
    }

    // 4. DELETE VISITOR LOG RECORD
    if (type === 'visitor') {
      const log = await VisitorLog.findById(id);
      if (!log) {
        return NextResponse.json({ error: 'Visitor record not found.' }, { status: 404 });
      }

      await VisitorLog.findByIdAndDelete(id);

      return NextResponse.json({
        success: true,
        message: 'Visitor record was deleted.',
      });
    }

    return NextResponse.json({ error: `Unknown record type "${type}".` }, { status: 400 });
  } catch (error) {
    console.error('Failed to delete admin record:', error);
    return NextResponse.json({ error: error.message || 'Server error during deletion.' }, { status: 500 });
  }
}
