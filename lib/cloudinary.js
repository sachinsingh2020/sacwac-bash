import crypto from 'node:crypto';

export function cloudinaryPublicIdFromUrl(url) {
  if (!url || !url.includes('/image/upload/')) return '';
  const path = url.split('/image/upload/')[1].split('?')[0];
  const parts = path.split('/');
  const versionIndex = parts.findIndex((part) => /^v\d+$/.test(part));
  const publicPath = (versionIndex >= 0 ? parts.slice(versionIndex + 1) : parts).join('/');
  return publicPath.replace(/\.[^/.]+$/, '');
}

export async function deleteCloudinaryAsset(publicId) {
  if (!publicId) return;
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = crypto.createHash('sha1')
    .update(`public_id=${publicId}&timestamp=${timestamp}${process.env.CLOUDINARY_API_SECRET}`)
    .digest('hex');
  const form = new URLSearchParams({
    public_id: publicId,
    api_key: process.env.CLOUDINARY_API_KEY,
    timestamp: timestamp.toString(),
    signature
  });
  const response = await fetch(`https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/destroy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form
  });
  const result = await response.json();
  if (!response.ok || (result.result !== 'ok' && result.result !== 'not found')) {
    throw new Error(`Cloudinary could not delete ${publicId}`);
  }
}

/**
 * Permanently delete all Cloudinary images associated with a record (portrait photo and gallery images).
 * Accepts a Page or AbandonedTemplate document/object with photo, photoPublicId, gallery, and galleryPublicIds.
 */
export async function deleteRecordCloudinaryAssets(record) {
  if (!record) return;
  if (!process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET || !process.env.CLOUDINARY_CLOUD_NAME) {
    console.warn('Cloudinary environment variables not configured; skipping asset deletion.');
    return;
  }

  const publicIds = new Set();

  if (record.photoPublicId && typeof record.photoPublicId === 'string' && record.photoPublicId.trim()) {
    publicIds.add(record.photoPublicId.trim());
  }
  if (record.photo && typeof record.photo === 'string' && record.photo.includes('cloudinary.com')) {
    const pid = cloudinaryPublicIdFromUrl(record.photo);
    if (pid) publicIds.add(pid);
  }

  if (Array.isArray(record.galleryPublicIds)) {
    record.galleryPublicIds.forEach((pid) => {
      if (pid && typeof pid === 'string' && pid.trim()) {
        publicIds.add(pid.trim());
      }
    });
  }

  if (Array.isArray(record.gallery)) {
    record.gallery.forEach((url) => {
      if (url && typeof url === 'string' && url.includes('cloudinary.com')) {
        const pid = cloudinaryPublicIdFromUrl(url);
        if (pid) publicIds.add(pid);
      }
    });
  }

  for (const pid of publicIds) {
    try {
      await deleteCloudinaryAsset(pid);
    } catch (err) {
      console.warn(`Failed to delete Cloudinary asset "${pid}":`, err.message);
    }
  }
}

