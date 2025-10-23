import admin from 'firebase-admin';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  // Check if service account credentials are provided
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } else {
    // For development: Use application default credentials or minimal config
    // In production, you should provide FIREBASE_SERVICE_ACCOUNT
    console.warn('Firebase Admin: No service account provided. Using application default credentials.');
    admin.initializeApp();
  }
}

export const auth = admin.auth();
export default admin;
