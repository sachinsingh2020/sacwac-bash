import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../lib/db';
import VisitorLog from '../../../models/VisitorLog';
import { extractClientIp, lookupGeoLocation, parseUserAgent } from '../../../lib/geoAndAgent';

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
      timezone: clientTimezone = '',
    } = body;

    const userAgentString = request.headers.get('user-agent') || '';
    const ip = extractClientIp(request);

    // Run GeoIP lookup and User-Agent parsing
    const [geo, agent] = await Promise.all([
      lookupGeoLocation(ip, clientTimezone),
      Promise.resolve(parseUserAgent(userAgentString)),
    ]);

    await connectToDatabase();

    const clientLat = typeof body.latitude === 'number' ? body.latitude : (typeof body.clientLat === 'number' ? body.clientLat : null);
    const clientLon = typeof body.longitude === 'number' ? body.longitude : (typeof body.clientLon === 'number' ? body.clientLon : null);
    const hasExactGps = clientLat !== null && clientLon !== null && !isNaN(clientLat) && !isNaN(clientLon);

    const log = await VisitorLog.create({
      slug: slug.trim(),
      pageTitle: pageTitle.trim(),
      url: url.trim(),
      referrer: referrer.trim() || 'Direct / Bookmark',
      ip: ip.trim(),
      city: geo.city,
      region: geo.region,
      country: geo.country,
      countryCode: geo.countryCode,
      postalCode: geo.postalCode,
      latitude: hasExactGps ? clientLat : null,
      longitude: hasExactGps ? clientLon : null,
      isExactGps: hasExactGps,
      locationCaptured: hasExactGps,
      timezone: geo.timezone || clientTimezone,
      isp: geo.isp,
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
