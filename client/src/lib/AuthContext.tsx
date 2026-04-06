import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  sendPasswordResetEmail,
  deleteUser as firebaseDeleteUser,
  reload,
} from 'firebase/auth';
import { auth } from './firebase';
import type { User as DBUser } from '@shared/schema';

interface AuthContextType {
  currentUser: User | null;
  userData: DBUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string, role: string, additionalData: any) => Promise<{ email: string; skipOtp?: boolean }>;
  signOut: () => Promise<void>;
  refreshUserData: () => Promise<void>;
  verifyOtp: (email: string, otp: string) => Promise<void>;
  resendOtp: (email: string) => Promise<void>;
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
          setCurrentUser({
            uid: data.firebaseUid || data.id,
            email: data.email,
            displayName: `${data.firstName} ${data.lastName}`,
          } as User);
          return;
        } else {
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
    
    if (!auth) {
      setUserData(null);
      return;
    }
    
    const user = auth.currentUser;
    if (!user) {
      setUserData(null);
      return;
    }

    if (!user.emailVerified) {
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
    const devToken = localStorage.getItem('dev_token');
    if (devToken) {
      refreshUserData().finally(() => setLoading(false));
      return () => {};
    }
    
    if (!auth) {
      console.warn('Firebase auth not initialized');
      setLoading(false);
      return () => {};
    }
    
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user && user.emailVerified) {
        await refreshUserData();
      } else {
        setUserData(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    const ADMIN_EMAIL = 'team@uninexus.uk';
    const isAdminLogin = email.toLowerCase().trim() === ADMIN_EMAIL;

    // Admin always uses the dedicated password-only login endpoint (no Firebase, no OTP)
    if (isAdminLogin) {
      const response = await fetch('/api/auth/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase().trim(), password }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || 'Invalid credentials');
      }

      const { token, user } = await response.json();
      localStorage.setItem('dev_token', token);
      setUserData(user);
      setCurrentUser({
        uid: user.firebaseUid || user.id,
        email: user.email,
        displayName: (user.firstName || '') + ' ' + (user.lastName || ''),
      } as User);
      return;
    }

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
        // Dev login unavailable, fall through to Firebase
      }
    }
    
    if (!auth) {
      throw new Error('Firebase authentication is not configured');
    }
    
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    
    await reload(userCredential.user);
    
    // Check DB-level verification (OTP-based) even if Firebase hasn't synced yet
    let dbVerified = userCredential.user.emailVerified;
    if (!dbVerified) {
      try {
        const token = await userCredential.user.getIdToken();
        const r = await fetch('/api/auth/user', {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (r.ok) {
          const u = await r.json();
          dbVerified = u.emailVerified === true;
        }
      } catch (_) {}
    }

    if (!dbVerified) {
      await firebaseSignOut(auth);
      const error = new Error('Please verify your email before logging in. Enter the 6-digit code sent to your inbox.');
      (error as any).code = 'auth/email-not-verified';
      (error as any).email = email;
      throw error;
    }
    
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
  ): Promise<{ email: string; skipOtp?: boolean }> => {
    const ADMIN_EMAIL = 'team@uninexus.uk';
    const isAdminEmail = email.toLowerCase().trim() === ADMIN_EMAIL;

    if (!auth) {
      throw new Error('Firebase authentication is not configured');
    }
    
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(userCredential.user, { displayName });

    // Create the DB record while we still have a valid token
    // The backend will generate and send the OTP (skipped for admin)
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
      let errorMessage = 'Failed to create user profile. Please try again.';
      try {
        const errorData = await response.json();
        if (errorData.message) errorMessage = errorData.message;
      } catch {
        // ignore JSON parse errors
      }

      try {
        await firebaseDeleteUser(userCredential.user);
      } catch (deleteError: any) {
        console.error('Failed to clean up Firebase user after registration error:', deleteError);
      }

      throw new Error(errorMessage);
    }

    // Sign out — user must verify via OTP before accessing the app
    // Admin is pre-verified; skip OTP and redirect to login
    await firebaseSignOut(auth);
    setCurrentUser(null);
    setUserData(null);

    return { email, skipOtp: isAdminEmail };
  };

  const verifyOtp = async (email: string, otp: string): Promise<void> => {
    const response = await fetch('/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp }),
    });

    const data = await response.json();

    if (!response.ok) {
      const error = new Error(data.message || 'Verification failed.');
      (error as any).reason = data.reason;
      throw error;
    }
  };

  const resendOtp = async (email: string): Promise<void> => {
    const response = await fetch('/api/auth/resend-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();

    if (!response.ok) {
      const error = new Error(data.message || 'Failed to resend code.');
      (error as any).code = data.code;
      throw error;
    }
  };

  const signOut = async () => {
    localStorage.removeItem('dev_token');
    
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
    verifyOtp,
    resendOtp,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
