import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../lib/db';
import VisitorLog from '../../../models/VisitorLog';
import { extractClientIp, parseUserAgent } from '../../../lib/geoAndAgent';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const {
      slug = '',
      pageTitle = '',
      url = '',
      referrer = 'Direct / Bookmark',
      screenResolution = '',
      language = '',
      visitorId = '',
      timezone = '',
    } = body;

    const userAgentString = request.headers.get('user-agent') || '';
    const ip = extractClientIp(request);
    const agent = parseUserAgent(userAgentString);

    await connectToDatabase();

    const log = await VisitorLog.create({
      slug: slug.trim(),
      pageTitle: pageTitle.trim(),
      url: url.trim(),
      referrer: referrer.trim() || 'Direct / Bookmark',
      ip: ip.trim(),
      timezone: timezone.trim(),
      browser: agent.browser,
      browserVersion: agent.browserVersion,
      os: agent.os,
      osVersion: agent.osVersion,
      device: agent.device,
      screenResolution: screenResolution.trim(),
      language: language.trim(),
      visitorId: visitorId.trim(),
      userAgent: userAgentString,
    });

    return NextResponse.json({
      success: true,
      id: log._id,
    });
  } catch (error) {
    console.error('Visitor tracking error:', error);
    return NextResponse.json(
      { error: 'Tracking service error.' },
      { status: 500 }
    );
  }
}
