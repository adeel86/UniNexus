import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiRequest } from '../config/api';

interface User {
  id: number;
  email: string;
  displayName: string | null;
  role: string;
}

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
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

const USER_STORAGE_KEY = '@uninexus_user';

export function AuthProvider({ children }: AuthProviderProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for stored user on mount
    checkStoredUser();
  }, []);

  const checkStoredUser = async () => {
    try {
      const [storedUser, token] = await AsyncStorage.multiGet([USER_STORAGE_KEY, '@uninexus_token']);
      
      if (storedUser[1] && token[1]) {
        // Validate token with backend before trusting cached user
        try {
          const response = await apiRequest('/api/auth/user');
          
          // Token is valid, use backend user data (fresher than cache)
          const user: User = {
            id: response.id,
            email: response.email,
            displayName: response.displayName || `${response.firstName} ${response.lastName}`,
            role: response.role,
          };
          
          // Update cached user with fresh data
          await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
          setCurrentUser(user);
        } catch (error) {
          // Token is invalid/expired - clear everything
          console.log('Token validation failed, clearing auth state');
          await AsyncStorage.multiRemove([USER_STORAGE_KEY, '@uninexus_token']);
          setCurrentUser(null);
        }
      }
    } catch (error) {
      console.error('Error loading stored user:', error);
      // Clear auth state on any error
      await AsyncStorage.multiRemove([USER_STORAGE_KEY, '@uninexus_token']);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    const response = await apiRequest('/api/auth/dev-login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    const user: User = {
      id: response.user.id,
      email: response.user.email,
      displayName: response.user.displayName || response.user.firstName + ' ' + response.user.lastName,
      role: response.user.role,
    };

    // Store the auth token for future requests
    await AsyncStorage.setItem('@uninexus_token', response.token);
    await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    setCurrentUser(user);
  };

  const signUp = async (email: string, password: string, displayName: string) => {
    // For now, signup is not supported in the mobile app
    // Users need to sign up on the web platform first
    throw new Error('Sign up is only available on the web platform. Please use the web app to create an account, then log in here with your demo account credentials.');
  };

  const signOut = async () => {
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Critical: Remove both user profile AND JWT token
      await AsyncStorage.multiRemove([USER_STORAGE_KEY, '@uninexus_token']);
      setCurrentUser(null);
    }
  };

  const value: AuthContextType = {
    currentUser,
    loading,
    signIn,
    signUp,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
