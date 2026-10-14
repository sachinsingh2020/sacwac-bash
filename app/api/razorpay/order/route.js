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

    // Pricing option: "login" (₹49) or "guest" (₹199)
    const tier = body.tier === 'login' ? 'login' : 'guest';
    let amount = config.amount; // default 19900 paise

    if (tier === 'login' && reqCurrency === 'INR') {
      amount = 4900; // ₹49 in paise
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
        offer: tier === 'login' ? 'Member Special (Logged In)' : 'Standard Unlock',
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
