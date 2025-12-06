export const colors = {
  primary: '#8B5CF6',
  secondary: '#EC4899',
  accent: '#3B82F6',
  
  background: '#FFFFFF',
  backgroundDark: '#0F0F23',
  surface: '#F8F9FA',
  surfaceDark: '#1A1A2E',
  
  text: '#1F2937',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  textLight: '#FFFFFF',
  
  border: '#E5E7EB',
  borderDark: '#374151',
  
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
  
  gradient: {
    primary: ['#8B5CF6', '#EC4899'] as const,
    secondary: ['#EC4899', '#3B82F6'] as const,
    full: ['#8B5CF6', '#EC4899', '#3B82F6'] as const,
  },
  
  roles: {
    student: '#8B5CF6',
    teacher: '#10B981',
    university: '#3B82F6',
    industry: '#F59E0B',
    admin: '#EF4444',
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const typography = {
  h1: { fontSize: 32, fontWeight: '800' as const },
  h2: { fontSize: 24, fontWeight: '700' as const },
  h3: { fontSize: 20, fontWeight: '600' as const },
  h4: { fontSize: 18, fontWeight: '600' as const },
  body: { fontSize: 16, fontWeight: '400' as const },
  bodySmall: { fontSize: 14, fontWeight: '400' as const },
  caption: { fontSize: 12, fontWeight: '400' as const },
  button: { fontSize: 16, fontWeight: '600' as const },
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
};
