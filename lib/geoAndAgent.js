/**
 * Utilities for extracting visitor IP, Geolocation, and parsing User-Agent.
 */

export function extractClientIp(request) {
  // Check common forwarding headers
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const list = forwarded.split(',').map((s) => s.trim());
    if (list.length > 0 && list[0]) return list[0];
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp.trim();

  const cfIp = request.headers.get('cf-connecting-ip');
  if (cfIp) return cfIp.trim();

  const vercelForwarded = request.headers.get('x-vercel-forwarded-for');
  if (vercelForwarded) return vercelForwarded.trim();

  return '127.0.0.1';
}

export function isLocalOrPrivateIp(ip) {
  if (!ip) return true;
  const cleanIp = ip.replace(/^::ffff:/, '').trim();
  return (
    cleanIp === '127.0.0.1' ||
    cleanIp === '::1' ||
    cleanIp === 'localhost' ||
    cleanIp.startsWith('192.168.') ||
    cleanIp.startsWith('10.') ||
    cleanIp.startsWith('172.16.') ||
    cleanIp.startsWith('fc00:') ||
    cleanIp.startsWith('fe80:')
  );
}

export async function lookupGeoLocation(ip, clientTimezone = '') {
  if (isLocalOrPrivateIp(ip)) {
    return {
      city: 'Localhost',
      region: 'Development',
      country: 'Local Network',
      countryCode: 'LOC',
      postalCode: '000000',
      latitude: null,
      longitude: null,
      timezone: clientTimezone || 'Asia/Kolkata',
      isp: 'Local Development Server',
    };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2200);

    const res = await fetch(`http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,country,countryCode,regionName,city,zip,lat,lon,timezone,isp`, {
      signal: controller.signal,
    }).catch(() => null);

    clearTimeout(timeoutId);

    if (res && res.ok) {
      const data = await res.json().catch(() => ({}));
      if (data && data.status === 'success') {
        return {
          city: data.city || 'Unknown City',
          region: data.regionName || 'Unknown Region',
          country: data.country || 'Unknown Country',
          countryCode: data.countryCode || '',
          postalCode: data.zip || '',
          latitude: typeof data.lat === 'number' ? data.lat : null,
          longitude: typeof data.lon === 'number' ? data.lon : null,
          timezone: data.timezone || clientTimezone || '',
          isp: data.isp || 'Unknown ISP',
        };
      }
    }
  } catch (err) {
    console.warn('GeoIP lookup failed for IP:', ip, err.message);
  }

  return {
    city: 'Unknown',
    region: 'Unknown',
    country: 'Unknown',
    countryCode: '',
    postalCode: '',
    latitude: null,
    longitude: null,
    timezone: clientTimezone || '',
    isp: 'Unknown',
  };
}

export function parseUserAgent(uaString = '') {
  const ua = (uaString || '').trim();
  if (!ua) {
    return {
      browser: 'Unknown',
      browserVersion: '',
      os: 'Unknown',
      osVersion: '',
      device: 'Desktop',
    };
  }

  // Device detection
  let device = 'Desktop';
  if (/iPad|Tablet|PlayBook/i.test(ua) || (ua.includes('Android') && !ua.includes('Mobile'))) {
    device = 'Tablet';
  } else if (/Mobi|Android|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)) {
    device = 'Mobile';
  }

  // OS detection
  let os = 'Unknown';
  let osVersion = '';

  if (ua.includes('Windows NT 10.0')) {
    os = 'Windows';
    osVersion = '10 / 11';
  } else if (ua.includes('Windows NT 6.3')) {
    os = 'Windows';
    osVersion = '8.1';
  } else if (ua.includes('Windows NT 6.1')) {
    os = 'Windows';
    osVersion = '7';
  } else if (ua.includes('Windows')) {
    os = 'Windows';
  } else if (ua.includes('Android')) {
    os = 'Android';
    const match = ua.match(/Android\s([0-9.]+)/i);
    if (match) osVersion = match[1];
  } else if (ua.includes('iPhone') || ua.includes('iPad') || ua.includes('iPod')) {
    os = 'iOS';
    const match = ua.match(/OS\s([0-9_]+)/i);
    if (match) osVersion = match[1].replace(/_/g, '.');
  } else if (ua.includes('Macintosh') || ua.includes('Mac OS X')) {
    os = 'macOS';
    const match = ua.match(/Mac OS X\s([0-9_]+)/i);
    if (match) osVersion = match[1].replace(/_/g, '.');
  } else if (ua.includes('Linux')) {
    os = 'Linux';
  } else if (ua.includes('CrOS')) {
    os = 'ChromeOS';
  }

  // Browser detection
  let browser = 'Unknown';
  let browserVersion = '';

  if (ua.includes('Edg/')) {
    browser = 'Edge';
    browserVersion = ua.match(/Edg\/([0-9.]+)/)?.[1] || '';
  } else if (ua.includes('OPR/') || ua.includes('Opera/')) {
    browser = 'Opera';
    browserVersion = ua.match(/(?:OPR|Opera)\/([0-9.]+)/)?.[1] || '';
  } else if (ua.includes('SamsungBrowser/')) {
    browser = 'Samsung Internet';
    browserVersion = ua.match(/SamsungBrowser\/([0-9.]+)/)?.[1] || '';
  } else if (ua.includes('Chrome/')) {
    browser = 'Chrome';
    browserVersion = ua.match(/Chrome\/([0-9.]+)/)?.[1] || '';
  } else if (ua.includes('Firefox/')) {
    browser = 'Firefox';
    browserVersion = ua.match(/Firefox\/([0-9.]+)/)?.[1] || '';
  } else if (ua.includes('Safari/') && !ua.includes('Chrome/')) {
    browser = 'Safari';
    browserVersion = ua.match(/Version\/([0-9.]+)/)?.[1] || '';
  }

  return {
    browser,
    browserVersion,
    os,
    osVersion,
    device,
  };
}
