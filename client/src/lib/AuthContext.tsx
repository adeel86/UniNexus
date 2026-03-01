import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth } from './firebase';
import type { User as DBUser } from '@shared/schema';

interface AuthContextType {
  currentUser: User | null;
  userData: DBUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string, role: string, additionalData: any) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<DBUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUserData = async () => {
    // Check if using dev auth (demo account)
    const devToken = localStorage.getItem('dev_token');
    
    if (devToken) {
      try {
        const response = await fetch('/api/auth/user', {
          headers: {
            'Authorization': `Bearer ${devToken}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setUserData(data);
          // Set stub currentUser for demo accounts to maintain consistent auth state
          setCurrentUser({
            uid: data.firebaseUid || data.id,
            email: data.email,
            displayName: `${data.firstName} ${data.lastName}`,
          } as User);
          return;
        } else {
          // Dev token might be expired
          localStorage.removeItem('dev_token');
          setUserData(null);
          setCurrentUser(null);
          return;
        }
      } catch (error) {
        console.error('Error fetching user data with dev token:', error);
        localStorage.removeItem('dev_token');
        setUserData(null);
        setCurrentUser(null);
        return;
      }
    }
    
    // Firebase authentication - check if auth is initialized
    if (!auth) {
      setUserData(null);
      return;
    }
    
    const user = auth.currentUser;
    if (!user) {
      setUserData(null);
      return;
    }

    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/auth/user', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUserData(data);
      } else {
        setUserData(null);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      setUserData(null);
    }
  };

  useEffect(() => {
    // Check for dev token first (demo accounts)
    const devToken = localStorage.getItem('dev_token');
    if (devToken) {
      refreshUserData().finally(() => setLoading(false));
      return () => {}; // No Firebase listener needed for dev auth
    }
    
    // Firebase authentication - only if auth is initialized
    if (!auth) {
      console.warn('Firebase auth not initialized');
      setLoading(false);
      return () => {};
    }
    
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        await refreshUserData();
      } else {
        setUserData(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    // Development auth bypass is disabled in production
    if (import.meta.env.VITE_DEV_AUTH_ENABLED === 'true') {
      try {
        const response = await fetch('/api/auth/dev-login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password }),
        });
        
        if (response.ok) {
          const { token, user } = await response.json();
          localStorage.setItem('dev_token', token);
          setUserData(user);
          setCurrentUser({
            uid: user.firebaseUid,
            email: user.email,
            displayName: user.firstName + ' ' + user.lastName,
          } as User);
          return;
        }
      } catch (error: any) {
        console.log('Dev login error:', error.message);
      }
    }
    
    // Use Firebase authentication
    if (!auth) {
      throw new Error('Firebase authentication is not configured');
    }
    await signInWithEmailAndPassword(auth, email, password);
    await refreshUserData();
  };

  const resetPassword = async (email: string) => {
    if (!auth) {
      throw new Error('Firebase authentication is not configured');
    }
    await sendPasswordResetEmail(auth, email);
  };

  const signUp = async (
    email: string, 
    password: string, 
    displayName: string, 
    role: string,
    additionalData: any
  ) => {
    if (!auth) {
      throw new Error('Firebase authentication is not configured');
    }
    
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(userCredential.user, { displayName });

    const token = await userCredential.user.getIdToken();
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        email,
        displayName,
        role,
        firebaseUid: userCredential.user.uid,
        ...additionalData,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to create user profile');
    }

    await refreshUserData();
  };

  const signOut = async () => {
    // Clear dev token if present
    localStorage.removeItem('dev_token');
    
    // Sign out from Firebase (no-op if not signed in)
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      // Ignore Firebase signOut errors if using dev auth
    }
    
    setUserData(null);
    setCurrentUser(null);
  };

  const value: AuthContextType = {
    currentUser,
    userData,
    loading,
    signIn,
    resetPassword,
    signUp,
    signOut,
    refreshUserData,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
