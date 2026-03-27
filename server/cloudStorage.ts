import admin from 'firebase-admin';
import { getStorage, Storage } from 'firebase-admin/storage';
import path from 'path';
import crypto from 'crypto';

let storage: Storage | null = null;
let bucket: ReturnType<Storage['bucket']> | null = null;
let isInitialized = false;

const STORAGE_BUCKET = process.env.VITE_FIREBASE_STORAGE_BUCKET || '';

export interface UploadResult {
  url: string;
  filename: string;
  size: number;
  contentType: string;
}

export interface UploadOptions {
  folder: 'images' | 'videos' | 'documents' | 'avatars';
  contentType: string;
  originalFilename: string;
}

export async function initializeCloudStorage(): Promise<boolean> {
  if (isInitialized && storage && bucket) {
    return true;
  }

  try {
    if (!STORAGE_BUCKET) {
      console.warn('VITE_FIREBASE_STORAGE_BUCKET not configured. Cloud storage will be unavailable.');
      return false;
    }

    const existingApps = admin.apps;
    if (existingApps.length === 0) {
      try {
        const serviceAccountEnv = process.env.VITE_FIREBASE_SERVICE_ACCOUNT_PATH || '';
        let serviceAccount: any;

        if (serviceAccountEnv.trim().startsWith('{')) {
          serviceAccount = JSON.parse(serviceAccountEnv);
        } else {
          const serviceAccountPath = serviceAccountEnv || '/etc/secrets/serviceAccountKey.json';
          const fs = await import('fs').then(m => m.promises);
          const fileContent = await fs.readFile(serviceAccountPath, 'utf-8');
          serviceAccount = JSON.parse(fileContent);
        }

        if (!serviceAccount.private_key || !serviceAccount.client_email) {
          console.warn("Service account is not a valid Firebase Admin service account.");
          return false;
        }

        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
          storageBucket: STORAGE_BUCKET,
        });
      } catch (error: any) {
        console.warn("Firebase service account not available. Cloud storage unavailable.", error.message);
        return false;
      }
    }

    storage = getStorage();
    bucket = storage.bucket(STORAGE_BUCKET);
    isInitialized = true;
    
    console.log('✓ Firebase Cloud Storage initialized successfully');
    console.log(`  Bucket: ${STORAGE_BUCKET}`);
    return true;
  } catch (error: any) {
    console.warn('Firebase Cloud Storage initialization failed:', error.message);
    return false;
  }
}

function generateUniqueFilename(originalFilename: string): string {
  const ext = path.extname(originalFilename);
  const uniqueId = crypto.randomBytes(16).toString('hex');
  const timestamp = Date.now();
  const sanitizedName = path.basename(originalFilename, ext)
    .replace(/[^a-z0-9]/gi, '_')
    .substring(0, 50);
  return `${sanitizedName}_${timestamp}_${uniqueId}${ext}`;
}

export async function uploadToCloud(
  buffer: Buffer,
  options: UploadOptions
): Promise<UploadResult | null> {
  if (!isInitialized || !bucket) {
    const initialized = await initializeCloudStorage();
    if (!initialized || !bucket) {
      console.warn('Cloud storage not available. Upload failed.');
      return null;
    }
  }

  try {
    const filename = generateUniqueFilename(options.originalFilename);
    const filePath = `${options.folder}/${filename}`;
    const file = bucket.file(filePath);

    await file.save(buffer, {
      metadata: {
        contentType: options.contentType,
        cacheControl: 'public, max-age=31536000',
      },
    });

    await file.makePublic();

    const publicUrl = `https://storage.googleapis.com/${STORAGE_BUCKET}/${filePath}`;

    return {
      url: publicUrl,
      filename: filename,
      size: buffer.length,
      contentType: options.contentType,
    };
  } catch (error: any) {
    console.error('Cloud storage upload error:', error.message);
    return null;
  }
}

export async function uploadMultipleToCloud(
  files: Array<{ buffer: Buffer; options: UploadOptions }>
): Promise<UploadResult[]> {
  const results: UploadResult[] = [];
  
  for (const { buffer, options } of files) {
    const result = await uploadToCloud(buffer, options);
    if (result) {
      results.push(result);
    }
  }
  
  return results;
}

export async function deleteFromCloud(fileUrl: string): Promise<boolean> {
  if (!isInitialized || !bucket) {
    return false;
  }

  try {
    const bucketPrefix = `https://storage.googleapis.com/${STORAGE_BUCKET}/`;
    if (!fileUrl.startsWith(bucketPrefix)) {
      return false;
    }

    const filePath = fileUrl.substring(bucketPrefix.length);
    const file = bucket.file(filePath);
    
    await file.delete();
    return true;
  } catch (error: any) {
    console.error('Cloud storage delete error:', error.message);
    return false;
  }
}

export function isCloudStorageAvailable(): boolean {
  return isInitialized && bucket !== null;
}

export function getStorageBucket(): string {
  return STORAGE_BUCKET;
}
