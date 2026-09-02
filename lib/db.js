import mongoose from 'mongoose';

let cached = globalThis.mongooseConnection;

export async function connectToDatabase() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not configured. Add it to .env.local.');
  if (cached?.connection?.readyState === 1) return cached;
  if (!cached) cached = globalThis.mongooseConnection = { connection: null, promise: null };
  if (!cached.promise) cached.promise = mongoose.connect(uri, { bufferCommands: false });
  cached.connection = await cached.promise;
  return cached;
}
