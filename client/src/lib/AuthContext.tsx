import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  sendPasswordResetEmail,
  sendEmailVerification,
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
  signUp: (email: string, password: string, displayName: string, role: string, additionalData: any) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUserData: () => Promise<void>;
  resendVerificationEmail: (email: string, password: string) => Promise<void>;
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

    // Do not load user data if email is not verified
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
        // Dev login unavailable, falling through to Firebase auth
      }
    }
    
    // Use Firebase authentication
    if (!auth) {
      throw new Error('Firebase authentication is not configured');
    }
    
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    
    // Reload the user to get the latest emailVerified status from Firebase
    await reload(userCredential.user);
    
    if (!userCredential.user.emailVerified) {
      // Sign out immediately — user must verify their email first
      await firebaseSignOut(auth);
      const error = new Error('Please verify your email before logging in. Check your inbox.');
      (error as any).code = 'auth/email-not-verified';
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
  ) => {
    if (!auth) {
      throw new Error('Firebase authentication is not configured');
    }
    
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(userCredential.user, { displayName });

    await sendEmailVerification(userCredential.user);

    // Create the DB record while we still have a valid token
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
      // Parse the actual error from the backend (e.g. domain-blocked message)
      let errorMessage = 'Failed to create user profile. Please try again.';
      try {
        const errorData = await response.json();
        if (errorData.message) errorMessage = errorData.message;
      } catch {
        // ignore JSON parse errors
      }

      // Critical: clean up the Firebase user we just created so the
      // email is not permanently locked out of registering again.
      try {
        await firebaseDeleteUser(userCredential.user);
      } catch (deleteError: any) {
        console.error('Failed to clean up Firebase user after registration error:', deleteError);
      }

      throw new Error(errorMessage);
    }

    // Sign out so the user must verify their email before getting access
    await firebaseSignOut(auth);
    setCurrentUser(null);
    setUserData(null);
  };

  const resendVerificationEmail = async (email: string, password: string) => {
    if (!auth) {
      throw new Error('Firebase authentication is not configured');
    }

    // Sign in temporarily to get the Firebase user object
    const userCredential = await signInWithEmailAndPassword(auth, email, password);

    if (userCredential.user.emailVerified) {
      // Already verified — sign out the temporary session
      await firebaseSignOut(auth);
      throw new Error('Your email is already verified. You can now log in.');
    }

    await sendEmailVerification(userCredential.user);

    // Sync verificationSentAt in the DB (non-fatal — don't block the flow)
    try {
      const token = await userCredential.user.getIdToken();
      await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ firebaseUid: userCredential.user.uid }),
      });
    } catch (syncError) {
      console.warn('Could not sync verificationSentAt to DB:', syncError);
    }

    // Sign out again — user must verify before accessing the app
    await firebaseSignOut(auth);
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
    resendVerificationEmail,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
