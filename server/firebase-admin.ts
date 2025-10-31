import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  try {
    // Priority 1: FIREBASE_SERVICE_ACCOUNT (JSON string)
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } else if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
      // Priority 2: FIREBASE_SERVICE_ACCOUNT_PATH can be either:
      // - a path to a JSON file, or
      // - the JSON string itself (accidentally put into the PATH var).
      const rawValue = process.env.FIREBASE_SERVICE_ACCOUNT_PATH.trim();
      try {
        let serviceAccount: any = null;
        // Heuristic: if it looks like JSON, parse it directly
        if (rawValue.startsWith('{') || rawValue.startsWith('[')) {
          serviceAccount = JSON.parse(rawValue);
        } else {
          const p = path.resolve(rawValue);
          if (fs.existsSync(p)) {
            const raw = fs.readFileSync(p, 'utf8');
            serviceAccount = JSON.parse(raw);
          } else {
            console.warn(`Firebase Admin: SERVICE_ACCOUNT_PATH provided but file not found at ${p}. Falling back to ADC.`);
          }
        }

        if (serviceAccount) {
          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
          });
        } else {
          admin.initializeApp();
        }
      } catch (e) {
        console.warn('Firebase Admin: Failed to parse service account from FIREBASE_SERVICE_ACCOUNT_PATH. Falling back to ADC.', e);
        try { admin.initializeApp(); } catch (ex) { /* ignore */ }
      }
    } else {
      // For development: Use application default credentials
      // In production, you should provide FIREBASE_SERVICE_ACCOUNT or FIREBASE_SERVICE_ACCOUNT_PATH
      console.warn('Firebase Admin: No service account provided. Using application default credentials.');
      admin.initializeApp();
    }
  } catch (err) {
    console.error('Failed to initialize Firebase Admin SDK:', err);
    // Fall back to application default credentials to avoid crashing the server
    try { admin.initializeApp(); } catch (e) { /* ignore */ }
  }
}

export const auth = admin.auth();
export default admin;
