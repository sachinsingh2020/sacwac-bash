import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { CURRENCY_CONFIG } from '../../../../lib/monthlyOffer';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const key_id = (process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '').trim();
    const key_secret = (process.env.RAZORPAY_KEY_SECRET || '').trim();

    if (!key_id || !key_secret) {
      return NextResponse.json(
        { error: 'Razorpay API credentials not configured.' },
        { status: 500 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const reqCurrency = (body.currency || 'INR').toUpperCase();
    const config = CURRENCY_CONFIG[reqCurrency] || CURRENCY_CONFIG.INR;

    // Pricing options: "offer29" (₹29), "offer39" (₹39), "login" (₹49), or "guest" (₹199)
    const offerPrice = Number(body.offerPrice || body.customPrice);
    let tier = body.tier || 'guest';
    let amount = config.amount; // default 19900 paise

    if (offerPrice === 29 || tier === 'offer29' || body.offer === '29') {
      amount = 2900; // ₹29 in paise
      tier = 'offer29';
    } else if (offerPrice === 39 || tier === 'offer39' || body.offer === '39') {
      amount = 3900; // ₹39 in paise
      tier = 'offer39';
    } else if ((tier === 'login' || body.offer === '49') && reqCurrency === 'INR') {
      amount = 4900; // ₹49 in paise
      tier = 'login';
    }

    const razorpay = new Razorpay({
      key_id,
      key_secret,
    });

    const receipt = `rcpt_${Date.now().toString().slice(-8)}`;

    const order = await razorpay.orders.create({
      amount,
      currency: config.currency,
      receipt,
      notes: {
        product: 'Magic Moments Celebration Page',
        offer: tier === 'offer29'
          ? 'Final Special Discount (₹29)'
          : tier === 'offer39'
          ? 'Special Exclusive Discount (₹39)'
          : tier === 'login'
          ? 'Member Special (Logged In ₹49)'
          : 'Standard Unlock (₹199)',
        tier,
        region: config.regionName,
      },
    });

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: key_id,
      tier,
    });
  } catch (error) {
    console.error('Razorpay order creation failed:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create payment order.' },
      { status: 500 }
    );
  }
}
