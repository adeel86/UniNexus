import AsyncStorage from '@react-native-async-storage/async-storage';

// API configuration for connecting to UniNexus backend
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000';

export async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  // Get auth token if it exists
  const token = await AsyncStorage.getItem('@uninexus_token');
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...options.headers,
    },
    credentials: 'include', // Include cookies for session management
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `Request failed with status ${response.status}`);
  }

  return response.json();
}
