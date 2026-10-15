import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../lib/db';
import AbandonedTemplate from '../../../../models/AbandonedTemplate';
import { verifyAdminAuth } from '../../../../lib/adminAuth';
import { sendEmail } from '../../../../lib/email';

export const dynamic = 'force-dynamic';

function getAppBaseUrl(request) {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, '');
  }
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'localhost:3000';
  const proto = request.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
}

export async function POST(request) {
  try {
    if (!verifyAdminAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required.' }, { status: 401 });
    }

    const { templateId, price } = await request.json().catch(() => ({}));

    if (!templateId) {
      return NextResponse.json({ error: 'Missing template ID.' }, { status: 400 });
    }

    const offerPrice = Number(price) === 29 ? 29 : 39;

    await connectToDatabase();

    const template = await AbandonedTemplate.findOne({ templateId }).lean();
    if (!template) {
      return NextResponse.json({ error: 'Template record not found.' }, { status: 404 });
    }

    if (!template.userEmail || !template.userEmail.includes('@')) {
      return NextResponse.json(
        { error: 'This user does not have a valid email address saved.' },
        { status: 400 }
      );
    }

    const baseUrl = getAppBaseUrl(request);
    const offerUrl = `${baseUrl}/offer/${template.templateId}?price=${offerPrice}`;
    const celebrantName = template.name || 'Someone Special';
    const regularPrice = 199;
    const discountAmount = regularPrice - offerPrice;

    let subject = '';
    let mainHeading = '';
    let messageBody = '';
    let ctaButtonText = '';
    let bannerTag = '';

    if (offerPrice === 29) {
      subject = `Final Offer: Get ${celebrantName}'s Birthday Wish in just ₹29! 🎂🎁`;
      mainHeading = `Final Exclusive Offer for ${celebrantName}'s Birthday Surprise`;
      bannerTag = `🔥 FINAL CHANCE OFFER • FLAT ₹${discountAmount} OFF`;
      messageBody = `This is our final offer for you! You can buy the birthday wish you created for <strong>${celebrantName}</strong> in <strong>just ₹29</strong>. Click below to preview and buy your celebration.`;
      ctaButtonText = `Buy in Just ₹29 Now →`;
    } else {
      subject = `Special Offer: Complete ${celebrantName}'s Birthday Template for just ₹39! ✨`;
      mainHeading = `A Special Birthday Offer Just For You ✨`;
      bannerTag = `🎁 EXCLUSIVE OFFER • ₹${discountAmount} SAVINGS`;
      messageBody = `You visited our site and created a celebration template for <strong>${celebrantName}</strong>, but didn't buy it so, this special offer is only for you! We want you to make that special person feel special so you can buy your created template in <strong>just ₹39</strong>. Click below to preview and buy your template in ₹39.`;
      ctaButtonText = `Buy Your Template in ₹39 →`;
    }

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${subject}</title>
      </head>
      <body style="margin: 0; padding: 24px 12px; background-color: #faf5f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #3b2029;">
        <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 540px; background-color: #ffffff; border-radius: 24px; border: 1px solid #f3d7df; box-shadow: 0 10px 30px rgba(180, 50, 80, 0.08); overflow: hidden;">
          <!-- Top Header -->
          <tr>
            <td style="padding: 28px 24px 20px; text-align: center; background: linear-gradient(180deg, #fff2f5 0%, #ffffff 100%); border-bottom: 1px solid #fae6eb;">
              <span style="font-size: 34px; line-height: 1; display: inline-block; margin-bottom: 8px;">✨🎂</span>
              <h1 style="margin: 0 0 6px; font-size: 22px; font-weight: 800; color: #431d28; letter-spacing: -0.02em;">Magic Moments</h1>
              <span style="display: inline-block; background: ${offerPrice === 29 ? '#fee2e2' : '#fce7f3'}; color: ${offerPrice === 29 ? '#b91c1c' : '#be185d'}; font-size: 11px; font-weight: 800; padding: 4px 12px; border-radius: 999px; letter-spacing: 0.04em;">
                ${bannerTag}
              </span>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 28px 24px 24px;">
              <h2 style="margin: 0 0 14px; font-size: 18px; font-weight: 700; color: #2c131c; line-height: 1.35;">
                ${mainHeading}
              </h2>

              <p style="margin: 0 0 20px; font-size: 14.5px; line-height: 1.6; color: #5a3843;">
                ${messageBody}
              </p>

              <!-- Celebrant Preview Card -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #fff9fa; border: 1.5px dashed #f5a9bc; border-radius: 18px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 18px 20px;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        ${template.photo ? `
                          <td width="64" valign="top" style="padding-right: 16px;">
                            <img src="${template.photo}" alt="${celebrantName}" width="64" height="64" style="border-radius: 50%; object-fit: cover; display: block; border: 2px solid #d95775;" />
                          </td>
                        ` : ''}
                        <td valign="middle">
                          <strong style="display: block; font-size: 16px; color: #421b27; margin-bottom: 4px;">
                            ${celebrantName} ${template.nickname ? `&ldquo;${template.nickname}&rdquo;` : ''}
                          </strong>
                          <span style="display: block; font-size: 12.5px; color: #7f5562; margin-bottom: 4px;">
                            📅 Birthday Date: <strong>${template.dob || template.date || 'Set in celebration'}</strong>
                          </span>
                          <span style="display: block; font-size: 12px; color: #9c6c7b;">
                            📸 ${(template.gallery || []).length} photos uploaded • ✦ ${(template.reasons || []).length} reasons added
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Pricing Highlight Box -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background: linear-gradient(135deg, #fff1f4 0%, #ffe4eb 100%); border-radius: 16px; margin-bottom: 24px; text-align: center;">
                <tr>
                  <td style="padding: 16px;">
                    <span style="font-size: 12px; font-weight: 700; color: #8e5868; text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 4px;">
                      Your Exclusive Discounted Price
                    </span>
                    <div style="font-size: 30px; font-weight: 800; color: ${offerPrice === 29 ? '#dc2626' : '#d95775'}; line-height: 1.1;">
                      ₹${offerPrice}
                      <span style="font-size: 16px; font-weight: 500; color: #a37280; text-decoration: line-through; margin-left: 8px;">₹${regularPrice}</span>
                    </div>
                    <span style="font-size: 12px; font-weight: 700; color: #16a34a; display: block; margin-top: 4px;">
                      ✓ Instant Savings of ₹${discountAmount} (Save ${(discountAmount / regularPrice * 100).toFixed(0)}%)
                    </span>
                  </td>
                </tr>
              </table>

              <!-- Action CTA Button -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 20px;">
                <tr>
                  <td align="center">
                    <a href="${offerUrl}" target="_blank" style="display: inline-block; width: 85%; max-width: 320px; background: linear-gradient(135deg, #ff577d 0%, #d95775 55%, #be2d53 100%); color: #ffffff; text-decoration: none; font-size: 15.5px; font-weight: 800; padding: 16px 24px; border-radius: 999px; text-align: center; box-shadow: 0 8px 24px rgba(217, 87, 117, 0.38); letter-spacing: -0.01em;">
                      ${ctaButtonText}
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0; font-size: 12.5px; text-align: center; color: #8a6773; line-height: 1.5;">
                Click the button above to preview your custom celebration and unlock your official permanent shareable link in just ₹${offerPrice}.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 24px; background-color: #faf0f2; border-top: 1px solid #fae1e6; text-align: center;">
              <p style="margin: 0 0 6px; font-size: 11.5px; color: #9c7380;">
                Magic Moments • The celebration experience they'll cherish forever.
              </p>
              <p style="margin: 0; font-size: 11px; color: #b896a2;">
                Sent exclusively to ${template.userEmail} for your drafted celebration surprise.
              </p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const emailText = `${mainHeading}\n\n${messageBody.replace(/<[^>]+>/g, '')}\n\nClaim your celebration template for just ₹${offerPrice} (Regular ₹${regularPrice}):\n${offerUrl}\n\nMagic Moments`;

    await sendEmail({
      to: template.userEmail,
      subject,
      html: emailHtml,
      text: emailText,
    });

    // Record this offer in AbandonedTemplate document
    try {
      await AbandonedTemplate.updateOne(
        { templateId: template.templateId },
        {
          $push: {
            offersSent: {
              price: offerPrice,
              sentAt: new Date(),
            },
          },
        }
      );
    } catch (dbErr) {
      console.warn('Could not record offer metadata:', dbErr.message);
    }

    return NextResponse.json({
      success: true,
      message: `Successfully sent ₹${offerPrice} offer to ${template.userEmail}`,
      offerUrl,
      sentAt: new Date(),
    });
  } catch (error) {
    console.error('Failed to send offer email:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send offer email. Check SMTP server configuration.' },
      { status: 500 }
    );
  }
}
