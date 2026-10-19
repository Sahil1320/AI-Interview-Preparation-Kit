import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-interview-prep-kit';

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
  memServer?: any;
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = global.mongooseCache || { conn: null, promise: null };

if (!global.mongooseCache) {
  global.mongooseCache = cached;
}

export async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = (async () => {
      // 1. Try configured MONGODB_URI first with a 2.5s timeout
      try {
        const m = await mongoose.connect(MONGODB_URI, {
          bufferCommands: false,
          serverSelectionTimeoutMS: 2500,
        });
        console.log('Connected to MongoDB via URI:', MONGODB_URI.replace(/:[^:]*@/, ':****@'));
        return m;
      } catch (err: any) {
        console.warn(`Could not connect to external MongoDB (${err.message}). Using persistent local database...`);
      }

      // 2. Persistent local MongoDB instance (preserves data across reloads)
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      const path = await import('path');
      const fs = await import('fs');
      const dataDir = path.resolve(process.cwd(), '.mongo-data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      if (!cached.memServer) {
        cached.memServer = await MongoMemoryServer.create({
          instance: { dbPath: dataDir },
        });
      }
      const memUri = cached.memServer.getUri();
      console.log('Connected to persistent local MongoDB database at:', memUri);
      return mongoose.connect(memUri, { bufferCommands: false });
    })();
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default connectDB;
