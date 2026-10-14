import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../lib/db';
import BirthdayPage from '../../../../models/BirthdayPage';
import { sendEmail } from '../../../../lib/email';
import { verifyAdminAuth } from '../../../../lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || 'sachin891singh@gmail.com';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.magicmoments.live';

    await connectToDatabase();

    // Check all paid celebration pages
    const pages = await BirthdayPage.find({
      $or: [{ isPaid: true }, { paymentId: { $regex: /^pay_/ } }],
      reminderSent: { $ne: true },
    }).lean();

    const now = new Date();
    const oneMonthMs = 30 * 24 * 60 * 60 * 1000;
    const remindersTriggered = [];

    for (const page of pages) {
      if (!page.date && !page.dob) continue;

      const birthdayDateStr = page.date || page.dob;
      const bdayDate = new Date(birthdayDateStr);
      if (isNaN(bdayDate.getTime())) continue;

      // Calculate the most recent birthday occurrence
      const currentYear = now.getFullYear();
      let thisYearBday = new Date(currentYear, bdayDate.getMonth(), bdayDate.getDate());
      
      // If this year's birthday is in the future, check last year's birthday
      if (thisYearBday > now) {
        thisYearBday = new Date(currentYear - 1, bdayDate.getMonth(), bdayDate.getDate());
      }

      // Check if it's been at least 30 days since that birthday
      const timeSinceBday = now.getTime() - thisYearBday.getTime();

      if (timeSinceBday >= oneMonthMs) {
        // Send email to admin
        const adminPageUrl = `${appUrl}/admin`;
        const emailHtml = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 540px; margin: 0 auto; padding: 32px 24px; background: #ffffff; border-radius: 20px; border: 1px solid #f2e1e5;">
            <div style="text-align: center; margin-bottom: 24px;">
              <span style="font-size: 38px;">🎂</span>
              <h1 style="color: #4a2835; font-size: 22px; margin: 8px 0 4px; font-weight: 700;">1-Month Post-Birthday Reminder</h1>
              <p style="color: #8b6b77; font-size: 13.5px; margin: 0;">Magic Moments Management Notice</p>
            </div>
            
            <p style="color: #442a34; font-size: 15px; line-height: 1.6; margin-bottom: 20px;">
              Hello Admin,<br/><br/>
              It has now been <strong>1 month</strong> since <strong>${page.name}</strong>'s birthday (${page.date || page.dob}).
            </p>

            <div style="background: #fff7f9; border: 1px solid #f6d8df; border-radius: 12px; padding: 18px; margin-bottom: 26px;">
              <p style="margin: 4px 0; font-size: 13px; color: #5a3c48;"><strong>Celebrant Name:</strong> ${page.name} (${page.nickname || 'N/A'})</p>
              <p style="margin: 4px 0; font-size: 13px; color: #5a3c48;"><strong>Slug / Link:</strong> <a href="${appUrl}/${page.slug}" style="color: #d95775;">${appUrl}/${page.slug}</a></p>
              <p style="margin: 4px 0; font-size: 13px; color: #5a3c48;"><strong>Customer Email:</strong> ${page.userEmail || 'Guest (Direct)'}</p>
              <p style="margin: 4px 0; font-size: 13px; color: #5a3c48;"><strong>Amount Paid:</strong> ₹${page.amountPaid || '199'}</p>
            </div>

            <p style="color: #442a34; font-size: 14.5px; line-height: 1.6; margin-bottom: 28px;">
              Would you like to review and manually delete this page? Click the button below to open your admin dashboard:
            </p>

            <div style="text-align: center; margin-bottom: 24px;">
              <a href="${adminPageUrl}" style="display: inline-block; background: #d95775; color: #ffffff; padding: 14px 28px; border-radius: 12px; font-weight: 700; text-decoration: none; font-size: 14px; box-shadow: 0 8px 22px rgba(217, 87, 117, 0.3);">
                Open Admin Dashboard →
              </a>
            </div>

            <p style="color: #927581; font-size: 12px; text-align: center; margin: 0;">
              Note: As per policy, customer data is never deleted automatically — only you can remove it manually from the admin panel.
            </p>
          </div>
        `;

        try {
          await sendEmail({
            to: adminEmail,
            subject: `[Magic Moments] 1 Month Post-Birthday Review: ${page.name}'s page (${page.slug})`,
            html: emailHtml,
          });

          // Mark reminderSent as true so we don't spam the admin
          await BirthdayPage.updateOne(
            { _id: page._id },
            { reminderSent: true, reminderSentAt: now }
          );

          remindersTriggered.push(page.slug);
        } catch (mailErr) {
          console.error(`Failed to send reminder email for ${page.slug}:`, mailErr.message);
        }
      }
    }

    return NextResponse.json({
      success: true,
      checkedCount: pages.length,
      remindersTriggeredCount: remindersTriggered.length,
      remindersTriggered,
    });
  } catch (error) {
    console.error('Reminder check failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
