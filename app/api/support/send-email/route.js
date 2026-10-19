import { NextResponse } from 'next/server';
import { sendEmail } from '../../../../lib/email';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const {
      name = '',
      email = '',
      paymentPhone = '',
      whatsappNumber = '',
      upiId = '',
      paymentRef = '',
      customMessage = '',
    } = body;

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedPaymentPhone = paymentPhone.trim();
    const trimmedWhatsapp = whatsappNumber.trim();
    const trimmedUpiId = upiId.trim();
    const trimmedRef = paymentRef.trim();

    if (!trimmedName) {
      return NextResponse.json({ error: 'Please enter your name.' }, { status: 400 });
    }
    if (!trimmedPaymentPhone) {
      return NextResponse.json({ error: 'Please enter the phone number used for payment.' }, { status: 400 });
    }
    if (!trimmedWhatsapp) {
      return NextResponse.json({ error: 'Please enter your WhatsApp number to receive the link.' }, { status: 400 });
    }
    if (!trimmedUpiId) {
      return NextResponse.json({ error: 'Please enter your UPI ID for refund assurance.' }, { status: 400 });
    }

    const destinationEmail = (process.env.SUPPORT_EMAIL || 'magicmoments.work@gmail.com').trim();

    const subject = `🚨 Payment Done - Link Not Received: ${trimmedName} (${trimmedPaymentPhone})`;

    const emailText = `
Payment Done - Link Request & Verification:
==========================================

Customer Details:
• Name: ${trimmedName}
• Contact Email: ${trimmedEmail || 'Not specified'}
• Payment Phone Number: ${trimmedPaymentPhone}
• WhatsApp Number for Delivery: ${trimmedWhatsapp}
• Razorpay Payment ID / UPI Ref: ${trimmedRef || 'Not provided'}
• Refund UPI ID: ${trimmedUpiId}

Customer Statement:
"If due to some reason my link is not generated then please return my money at this UPI ID: ${trimmedUpiId}"

${customMessage ? `Additional Message:\n"${customMessage}"\n` : ''}

Sent from Magic Moments Payment Support Portal.
    `.trim();

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>${subject}</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #faf5f7; margin: 0; padding: 24px 12px; color: #3b2229;">
        <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; background: #ffffff; border-radius: 18px; border: 1.5px solid #fed7e2; overflow: hidden; box-shadow: 0 8px 24px rgba(225, 29, 72, 0.08);">
          <!-- Header -->
          <tr>
            <td style="padding: 24px 24px 18px; background: linear-gradient(135deg, #fff0f3 0%, #ffe4ec 100%); border-bottom: 1px solid #fed7e2; text-align: center;">
              <span style="font-size: 32px; display: inline-block; margin-bottom: 6px;">💌🚨</span>
              <h1 style="margin: 0; font-size: 20px; font-weight: 800; color: #881337;">Payment Done · Link Not Received</h1>
              <p style="margin: 6px 0 0; font-size: 13px; color: #9f1239; font-weight: 600;">Immediate Customer Assistance Request</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 24px;">
              <p style="margin: 0 0 16px; font-size: 14.5px; color: #4a2833; line-height: 1.6;">
                A customer has reported completing their payment on Magic Moments but has not received their celebration link. Please review the details below to verify their transaction:
              </p>

              <!-- Details Table -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background: #fff8f9; border: 1px solid #fbcfe8; border-radius: 14px; margin-bottom: 20px;">
                <tr>
                  <td style="padding: 16px;">
                    <table border="0" cellpadding="6" cellspacing="0" width="100%" style="font-size: 13.5px; color: #4a2833;">
                      <tr>
                        <td width="38%" style="font-weight: 700; color: #881337;">👤 Customer Name:</td>
                        <td style="font-weight: 600;">${trimmedName}</td>
                      </tr>
                      ${trimmedEmail ? `
                      <tr>
                        <td style="font-weight: 700; color: #881337;">✉️ Customer Email:</td>
                        <td><a href="mailto:${trimmedEmail}" style="color: #d95775; font-weight: 600;">${trimmedEmail}</a></td>
                      </tr>
                      ` : ''}
                      <tr>
                        <td style="font-weight: 700; color: #881337;">📱 Payment Phone No:</td>
                        <td style="font-weight: 700; color: #1e293b;">${trimmedPaymentPhone}</td>
                      </tr>
                      <tr>
                        <td style="font-weight: 700; color: #881337;">💬 WhatsApp to Send Link:</td>
                        <td>
                          <a href="https://wa.me/${trimmedWhatsapp.replace(/[^0-9]/g, '')}" target="_blank" style="color: #16a34a; font-weight: 700; text-decoration: none;">
                            ${trimmedWhatsapp} ↗
                          </a>
                        </td>
                      </tr>
                      <tr>
                        <td style="font-weight: 700; color: #881337;">🧾 Payment Ref / Order:</td>
                        <td style="font-family: monospace; font-size: 13px; color: #475569;">${trimmedRef || 'Not provided'}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Refund Assurance Highlight Box -->
              <div style="background: #fef2f2; border: 1.5px dashed #fca5a5; border-radius: 12px; padding: 14px 16px; margin-bottom: 20px;">
                <span style="font-size: 12px; font-weight: 800; color: #991b1b; text-transform: uppercase; letter-spacing: 0.04em; display: block; margin-bottom: 4px;">
                  ⚠️ Customer Refund Guarantee Request:
                </span>
                <p style="margin: 0; font-size: 14px; font-weight: 600; color: #7f1d1d; line-height: 1.5;">
                  &ldquo;If due to some reason my link is not generated then please return my money at this UPI ID: <strong style="color: #991b1b; font-size: 15px; text-decoration: underline;">${trimmedUpiId}</strong>&rdquo;
                </p>
              </div>

              ${customMessage ? `
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 14px; margin-bottom: 20px;">
                <span style="font-size: 12px; font-weight: 700; color: #475569; display: block; margin-bottom: 4px;">Additional Notes:</span>
                <p style="margin: 0; font-size: 13px; color: #334155; font-style: italic;">&ldquo;${customMessage}&rdquo;</p>
              </div>
              ` : ''}

              <!-- Direct Action Buttons -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <a href="https://wa.me/${trimmedWhatsapp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hi ${trimmedName}, this is Magic Moments Support regarding your celebration page payment.`)}" target="_blank" style="display: inline-block; background: #25D366; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 800; padding: 12px 24px; border-radius: 999px; margin-right: 8px; margin-bottom: 8px;">
                      💬 Chat on WhatsApp
                    </a>
                    ${trimmedEmail ? `
                    <a href="mailto:${trimmedEmail}?subject=Regarding%20your%20Magic%20Moments%20Celebration%20Link" style="display: inline-block; background: #e11d48; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 800; padding: 12px 24px; border-radius: 999px; margin-bottom: 8px;">
                      ✉️ Reply by Email
                    </a>
                    ` : ''}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 16px 24px; background: #fff5f7; border-top: 1px solid #fee2e2; text-align: center; font-size: 12px; color: #881337;">
              Magic Moments Customer Support Hub · <a href="https://www.magicmoments.live" style="color: #d95775;">magicmoments.live</a>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    await sendEmail({
      to: destinationEmail,
      subject,
      html: emailHtml,
      text: emailText,
      replyTo: trimmedEmail || undefined,
    });

    return NextResponse.json({
      success: true,
      message: 'Support email sent successfully.',
    });
  } catch (error) {
    console.error('Support email sending error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send support email. Please try again or email magicmoments.work@gmail.com directly.' },
      { status: 500 }
    );
  }
}
