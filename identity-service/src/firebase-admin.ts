// uninexus-identity-service/src/firebase-admin.ts

import admin from 'firebase-admin';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } else {
    console.warn('Firebase Admin: No service account provided. Using application default credentials.');
    admin.initializeApp();
  }
}

export const auth = admin.auth();
export default admin;
