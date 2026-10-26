import crypto from 'crypto';
import { extractClientIp } from './geoAndAgent';

export function hashSha256(val) {
  if (!val || typeof val !== 'string') return undefined;
  const cleaned = val.trim().toLowerCase();
  if (!cleaned) return undefined;
  return crypto.createHash('sha256').update(cleaned).digest('hex');
}

/**
 * Sends a server-side conversion event to Meta Conversions API (CAPI).
 * Automatically deduplicates with browser Meta Pixel when event_id matches.
 */
export async function trackMetaServerEvent({
  eventName,
  eventId,
  eventSourceUrl,
  userEmail,
  userPhone,
  customData = {},
  request,
}) {
  const pixelId = (
    process.env.META_PIXEL_ID ||
    process.env.NEXT_PUBLIC_META_PIXEL_ID ||
    '1104513965255964'
  ).trim();

  const accessToken = (
    process.env.META_ACCESS_TOKEN ||
    process.env.FACEBOOK_ACCESS_TOKEN ||
    ''
  ).trim();

  if (!accessToken || !pixelId) {
    console.warn('[Meta CAPI] Skipped: META_ACCESS_TOKEN or META_PIXEL_ID not configured.');
    return { success: false, reason: 'missing_credentials' };
  }

  try {
    let clientIp = undefined;
    let userAgent = undefined;
    let fbp = undefined;
    let fbc = undefined;

    if (request) {
      try {
        clientIp = extractClientIp(request);
      } catch (e) {}

      userAgent = request.headers.get('user-agent') || undefined;
      fbp = request.cookies.get('_fbp')?.value || undefined;
      fbc = request.cookies.get('_fbc')?.value || undefined;

      if (!eventSourceUrl) {
        eventSourceUrl = request.headers.get('referer') || request.url || undefined;
      }
    }

    const userData = {};

    if (userEmail) {
      const hashedEmail = hashSha256(userEmail);
      if (hashedEmail) userData.em = [hashedEmail];
    }

    if (userPhone) {
      const cleanedPhone = userPhone.replace(/[^0-9]/g, '');
      const hashedPhone = hashSha256(cleanedPhone);
      if (hashedPhone) userData.ph = [hashedPhone];
    }

    if (clientIp) userData.client_ip_address = clientIp;
    if (userAgent) userData.client_user_agent = userAgent;
    if (fbp) userData.fbp = fbp;
    if (fbc) userData.fbc = fbc;

    const eventPayload = {
      event_name: eventName,
      event_time: Math.floor(Date.now() / 1000),
      action_source: 'website',
      event_source_url: eventSourceUrl || 'https://magicmoments0.online',
      user_data: userData,
      custom_data: customData,
    };

    if (eventId) {
      eventPayload.event_id = String(eventId);
    }

    const bodyPayload = {
      data: [eventPayload],
      access_token: accessToken,
    };

    const testCode = (process.env.META_TEST_EVENT_CODE || '').trim();
    if (testCode) {
      bodyPayload.test_event_code = testCode;
    }

    const res = await fetch(`https://graph.facebook.com/v19.0/${pixelId}/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bodyPayload),
    });

    const result = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error('[Meta CAPI] API returned error:', result);
      return { success: false, error: result };
    }

    console.log(`[Meta CAPI] Successfully sent ${eventName} event (eventID: ${eventId || 'none'}):`, result);
    return { success: true, result };
  } catch (error) {
    console.error('[Meta CAPI] Network or dispatch error:', error.message);
    return { success: false, error: error.message };
  }
}
