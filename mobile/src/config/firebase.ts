import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'demo-api-key',
  authDomain: 'demo-project.firebaseapp.com',
  projectId: 'demo-project',
  storageBucket: 'demo-project.appspot.com',
  messagingSenderId: '123456789',
  appId: '1:123456789:web:abcdef',
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Get Auth instance - persistence is handled automatically by Expo's secure storage
const auth = getAuth(app);

export { auth };
