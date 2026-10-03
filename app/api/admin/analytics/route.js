import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../lib/db';
import VisitorLog from '../../../../models/VisitorLog';
import { verifyAdminAuth } from '../../../../lib/adminAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    if (!verifyAdminAuth(request)) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin authentication required.' },
        { status: 401 }
      );
    }

    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const slugFilter = (searchParams.get('slug') || '').trim();
    const customDateStr = (searchParams.get('customDate') || searchParams.get('date') || '').trim();
    const limit = Math.min(parseInt(searchParams.get('limit') || '150', 10), 500);

    const now = new Date();

    // Start of Today (local server date)
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

    // Start of This Week (Monday or 7 days ago - let's do 7 days ago to now for rolling week, or start of current week)
    const dayOfWeek = now.getDay(); // 0 is Sunday
    const distanceToMonday = (dayOfWeek + 6) % 7;
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - distanceToMonday, 0, 0, 0, 0);

    // Start of This Month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);

    // Start of This Year
    const startOfYear = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);

    // Base query filter (if filtering by a specific slug)
    const baseMatch = slugFilter && slugFilter !== 'all' ? { slug: slugFilter } : {};

    // Parallel count queries
    const [
      countTotal,
      countUniqueTotal,
      countToday,
      countUniqueToday,
      countWeek,
      countMonth,
      countYear,
      availableSlugs,
    ] = await Promise.all([
      VisitorLog.countDocuments(baseMatch),
      VisitorLog.distinct('visitorId', baseMatch).then((res) => res.length),
      VisitorLog.countDocuments({ ...baseMatch, createdAt: { $gte: startOfToday } }),
      VisitorLog.distinct('visitorId', { ...baseMatch, createdAt: { $gte: startOfToday } }).then((res) => res.length),
      VisitorLog.countDocuments({ ...baseMatch, createdAt: { $gte: startOfWeek } }),
      VisitorLog.countDocuments({ ...baseMatch, createdAt: { $gte: startOfMonth } }),
      VisitorLog.countDocuments({ ...baseMatch, createdAt: { $gte: startOfYear } }),
      VisitorLog.distinct('slug', { slug: { $ne: '' } }),
    ]);

    // Custom Date calculations if requested
    let customDateStats = null;
    let queryForLogs = { ...baseMatch };

    if (customDateStr) {
      const match = customDateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
      if (match) {
        const year = parseInt(match[1], 10);
        const month = parseInt(match[2], 10) - 1;
        const day = parseInt(match[3], 10);

        const customDayStart = new Date(year, month, day, 0, 0, 0, 0);
        const customDayEnd = new Date(year, month, day, 23, 59, 59, 999);

        const [customCount, customUnique] = await Promise.all([
          VisitorLog.countDocuments({
            ...baseMatch,
            createdAt: { $gte: customDayStart, $lte: customDayEnd },
          }),
          VisitorLog.distinct('visitorId', {
            ...baseMatch,
            createdAt: { $gte: customDayStart, $lte: customDayEnd },
          }).then((res) => res.length),
        ]);

        customDateStats = {
          date: customDateStr,
          formatted: customDayStart.toLocaleDateString(undefined, {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          }),
          count: customCount,
          uniqueVisitors: customUnique,
        };

        // When customDate is passed, filter the records list to that custom date
        queryForLogs.createdAt = { $gte: customDayStart, $lte: customDayEnd };
      }
    }

    // Fetch records list (most recent first)
    const logs = await VisitorLog.find(queryForLogs)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    // Aggregations for charts & breakdowns
    const [topDevices, topBrowsers, topCountries] = await Promise.all([
      VisitorLog.aggregate([
        { $match: baseMatch },
        { $group: { _id: '$device', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]),
      VisitorLog.aggregate([
        { $match: baseMatch },
        { $group: { _id: '$browser', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 6 },
      ]),
      VisitorLog.aggregate([
        { $match: baseMatch },
        { $group: { _id: '$country', count: { $sum: 1 }, countryCode: { $first: '$countryCode' } } },
        { $sort: { count: -1 } },
        { $limit: 6 },
      ]),
    ]);

    return NextResponse.json({
      summary: {
        today: countToday,
        uniqueToday: countUniqueToday,
        thisWeek: countWeek,
        thisMonth: countMonth,
        thisYear: countYear,
        total: countTotal,
        uniqueTotal: countUniqueTotal,
      },
      customDate: customDateStats,
      breakdowns: {
        devices: topDevices.map((d) => ({ name: d._id || 'Unknown', count: d.count })),
        browsers: topBrowsers.map((b) => ({ name: b._id || 'Unknown', count: b.count })),
        countries: topCountries.map((c) => ({
          name: c._id || 'Unknown',
          countryCode: c.countryCode || '',
          count: c.count,
        })),
      },
      availableSlugs: availableSlugs.filter(Boolean),
      recordsCount: logs.length,
      records: logs.map((log) => ({
        id: log._id.toString(),
        slug: log.slug || '',
        pageTitle: log.pageTitle || '',
        url: log.url || '',
        referrer: log.referrer || 'Direct / Bookmark',
        ip: log.ip || 'Unknown',
        city: log.city || 'Unknown',
        region: log.region || 'Unknown',
        country: log.country || 'Unknown',
        countryCode: log.countryCode || '',
        postalCode: log.postalCode || '',
        latitude: log.isExactGps ? log.latitude : null,
        longitude: log.isExactGps ? log.longitude : null,
        isExactGps: Boolean(log.isExactGps),
        locationCaptured: Boolean(log.locationCaptured || log.isExactGps),
        locationPermission: log.locationPermission || (log.isExactGps ? 'granted' : 'unknown'),
        timezone: log.timezone || '',
        isp: log.isp || 'Unknown',
        browser: log.browser || 'Unknown',
        browserVersion: log.browserVersion || '',
        os: log.os || 'Unknown',
        osVersion: log.osVersion || '',
        device: log.device || 'Desktop',
        screenResolution: log.screenResolution || '',
        language: log.language || '',
        visitorId: log.visitorId || '',
        userAgent: log.userAgent || '',
        createdAt: log.createdAt,
      })),
    });
  } catch (error) {
    console.error('Admin analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve analytics data.' },
      { status: 500 }
    );
  }
}
