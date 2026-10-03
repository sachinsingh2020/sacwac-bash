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
    const permission = (body.locationPermission || (hasExactGps ? 'granted' : 'denied')).trim();

    // Prefer exact GPS location; fallback to IP geolocation if GPS wasn't permitted
    const finalCity = hasExactGps && body.gpsCity
      ? body.gpsCity.trim()
      : (geo.city && geo.city !== 'Unknown' && geo.city !== 'Localhost' ? geo.city : 'Location not found');

    const finalRegion = hasExactGps && body.gpsRegion
      ? body.gpsRegion.trim()
      : (geo.region && geo.region !== 'Unknown' && geo.region !== 'Development' ? geo.region : '');

    const finalCountry = hasExactGps && body.gpsCountry
      ? body.gpsCountry.trim()
      : (geo.country && geo.country !== 'Unknown' && geo.country !== 'Local Network' ? geo.country : 'Location not found');

    const finalCountryCode = hasExactGps && body.gpsCountryCode
      ? body.gpsCountryCode.trim()
      : geo.countryCode;

    const finalPostal = hasExactGps && body.gpsPostal
      ? body.gpsPostal.trim()
      : (geo.postalCode && geo.postalCode !== '000000' ? geo.postalCode : '');

    const isCaptured = hasExactGps || (finalCity !== 'Location not found' && finalCountry !== 'Location not found');

    const log = await VisitorLog.create({
      slug: slug.trim(),
      pageTitle: pageTitle.trim(),
      url: url.trim(),
      referrer: referrer.trim() || 'Direct / Bookmark',
      ip: ip.trim(),
      city: finalCity,
      region: finalRegion,
      country: finalCountry,
      countryCode: finalCountryCode,
      postalCode: finalPostal,
      latitude: hasExactGps ? clientLat : null,
      longitude: hasExactGps ? clientLon : null,
      isExactGps: hasExactGps,
      locationCaptured: isCaptured,
      locationPermission: permission,
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
