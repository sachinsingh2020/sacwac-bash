import { NextResponse } from 'next/server';
import crypto from 'node:crypto';

export const runtime = 'nodejs';

export async function POST(request) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json({ error: 'Cloudinary is not configured on the server.' }, { status: 503 });
  }

  const formData = await request.formData();
  const file = formData.get('file');
  if (!file || typeof file === 'string') return NextResponse.json({ error: 'An image file is required.' }, { status: 400 });
  if (file.size > 1024 * 1024) return NextResponse.json({ error: 'Images must be smaller than 1 MB.' }, { status: 413 });
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    return NextResponse.json({ error: 'Only JPG, PNG, and WEBP images are supported.' }, { status: 415 });
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const signature = crypto.createHash('sha1')
    .update(`folder=birthday-bloom&timestamp=${timestamp}${apiSecret}`)
    .digest('hex');
  const upload = new FormData();
  upload.append('file', file);
  upload.append('api_key', apiKey);
  upload.append('timestamp', timestamp.toString());
  upload.append('folder', 'birthday-bloom');
  upload.append('signature', signature);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body: upload
  });
  const result = await response.json();
  if (!response.ok) {
    console.error('Cloudinary upload failed:', result);
    return NextResponse.json({ error: 'Cloudinary upload failed.' }, { status: 502 });
  }
  return NextResponse.json({ url: result.secure_url, publicId: result.public_id });
}
