import { NextResponse } from 'next/server';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import { connectToDatabase } from '../../../../lib/db';
import BirthdayPage from '../../../../models/BirthdayPage';
import AbandonedTemplate from '../../../../models/AbandonedTemplate';
import { verifyToken } from '../../../../lib/jwt';

export const dynamic = 'force-dynamic';

function cleanPayload(body = {}) {
  const dob = body.dob?.toString().trim() || '';
  const date = body.date?.toString().trim() || dob || new Date().toISOString().split('T')[0];

  return {
    name: body.name?.trim() || 'Someone Special',
    nickname: body.nickname?.trim() || '',
    sender: body.sender?.trim() || '',
    dob,
    age: body.age?.toString().trim() || '',
    date,
    message: body.message?.trim() || 'Wishing you a magical and unforgettable birthday filled with joy and love!',
    reasons: Array.isArray(body.reasons)
      ? body.reasons.map((r) => r?.toString().trim()).filter(Boolean).slice(0, 5)
      : [],
    photo: body.photo || '',
    photoPublicId: body.photoPublicId || '',
    gallery: Array.isArray(body.gallery) ? body.gallery.slice(0, 17) : [],
    galleryPublicIds: Array.isArray(body.galleryPublicIds) ? body.galleryPublicIds.slice(0, 17) : []
  };
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      pagePayload,
      templateId,
      tier,
      userEmail: explicitUserEmail,
    } = body;

    const key_secret = (process.env.RAZORPAY_KEY_SECRET || '').trim();
    const key_id = (process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '').trim();

    if (!key_secret) {
      return NextResponse.json({ error: 'Razorpay secret not configured' }, { status: 500 });
    }

    if (!razorpay_payment_id || !razorpay_order_id) {
      return NextResponse.json(
        { error: 'Missing payment verification credentials.' },
        { status: 400 }
      );
    }

    // 1. Verify cryptographic HMAC SHA256 signature
    let isSignatureValid = false;
    if (razorpay_signature) {
      try {
        const hmac = crypto.createHmac('sha256', key_secret);
        hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
        const generatedSignature = hmac.digest('hex');
        isSignatureValid = generatedSignature === razorpay_signature;
      } catch (hmacErr) {
        console.warn('HMAC calculation error:', hmacErr);
      }
    }

    // 2. Query Razorpay API directly to get the verified payment amount and status
    let paymentAmount = tier === 'offer29' ? 29 : tier === 'offer39' ? 39 : tier === 'login' ? 49 : 199;
    if (key_id && key_secret) {
      try {
        const razorpay = new Razorpay({ key_id, key_secret });
        const payment = await razorpay.payments.fetch(razorpay_payment_id);
        if (payment) {
          if (payment.amount) {
            paymentAmount = Math.round(payment.amount / 100);
          }
          if (
            !isSignatureValid &&
            payment.order_id === razorpay_order_id &&
            (payment.status === 'captured' || payment.status === 'authorized')
          ) {
            console.log('Payment verified via Razorpay API fetch fallback:', payment.id);
            isSignatureValid = true;
          }
        }
      } catch (fetchErr) {
        console.error('Razorpay payment fetch error:', fetchErr.message);
      }
    }

    if (!isSignatureValid) {
      return NextResponse.json(
        { error: 'Payment verification failed: invalid signature.' },
        { status: 400 }
      );
    }

    // Payment signature verified! Connect to database
    await connectToDatabase();

    // Check if celebration page was already created for this paymentId (idempotency)
    const existingPage = await BirthdayPage.findOne({ paymentId: razorpay_payment_id });
    if (existingPage) {
      if (templateId) {
        try {
          await AbandonedTemplate.updateOne(
            { templateId },
            { isConverted: true, userEmail: existingPage.userEmail || undefined }
          );
        } catch (err) {
          console.warn('Failed to mark template as converted:', err.message);
        }
      }
      return NextResponse.json({
        success: true,
        slug: existingPage.slug,
        id: existingPage.slug,
      });
    }

    // If pagePayload is missing or incomplete, fall back to AbandonedTemplate
    let effectivePayload = pagePayload;
    if ((!effectivePayload || !effectivePayload.name) && templateId) {
      try {
        const draft = await AbandonedTemplate.findOne({ templateId });
        if (draft) {
          effectivePayload = draft.formData || draft.toObject();
        }
      } catch (draftErr) {
        console.warn('Fallback draft lookup error:', draftErr.message);
      }
    }

    const data = cleanPayload(effectivePayload);

    // Get current logged in user from cookie/token if available
    let userEmail = '';
    let userId = null;
    const token = request.cookies.get('user_token')?.value;
    if (token) {
      const decoded = verifyToken(token);
      if (decoded) {
        userEmail = decoded.email || '';
        userId = decoded.userId || null;
      }
    }
    if (!userEmail) {
      userEmail = (
        explicitUserEmail ||
        body.userEmail ||
        (effectivePayload && effectivePayload.userEmail) ||
        ''
      ).trim();
    }

    const baseSlug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '') || 'birthday';
    let slug = `${baseSlug}${Math.floor(1000 + Math.random() * 8999)}`;

    let attempts = 0;
    while (await BirthdayPage.exists({ slug }) && attempts < 5) {
      slug = `${baseSlug}${Math.floor(1000 + Math.random() * 8999)}`;
      attempts++;
    }

    const page = await BirthdayPage.create({
      ...data,
      slug,
      isPaid: true,
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      amountPaid: paymentAmount,
      userEmail,
      userId,
    });

    // Mark abandoned template as converted if templateId was provided
    if (templateId) {
      try {
        await AbandonedTemplate.updateOne(
          { templateId },
          { isConverted: true, userEmail: userEmail || undefined }
        );
      } catch (err) {
        console.warn('Failed to mark template as converted:', err.message);
      }
    }

    return NextResponse.json({
      success: true,
      slug: page.slug,
      id: page.slug,
    });
  } catch (error) {
    console.error('Payment verification / save failed:', error);
    return NextResponse.json(
      { error: error.message || 'Payment verified but failed to save celebration page.' },
      { status: 500 }
    );
  }
}
