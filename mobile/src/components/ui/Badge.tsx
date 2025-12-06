import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { colors, borderRadius, spacing } from '../../config/theme';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'outline';
  size?: 'sm' | 'md';
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Badge({
  children,
  variant = 'default',
  size = 'md',
  style,
  textStyle,
}: BadgeProps) {
  const variantStyles: Record<string, ViewStyle> = {
    default: { backgroundColor: colors.surface },
    primary: { backgroundColor: colors.primary },
    secondary: { backgroundColor: colors.secondary },
    success: { backgroundColor: colors.success },
    warning: { backgroundColor: colors.warning },
    error: { backgroundColor: colors.error },
    outline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border },
  };

  const textColors: Record<string, string> = {
    default: colors.text,
    primary: colors.textLight,
    secondary: colors.textLight,
    success: colors.textLight,
    warning: colors.textLight,
    error: colors.textLight,
    outline: colors.text,
  };

  const sizeStyles = {
    sm: { paddingVertical: 2, paddingHorizontal: 6, fontSize: 10 },
    md: { paddingVertical: 4, paddingHorizontal: 10, fontSize: 12 },
  };

  return (
    <View style={[styles.badge, variantStyles[variant], { paddingVertical: sizeStyles[size].paddingVertical, paddingHorizontal: sizeStyles[size].paddingHorizontal }, style]}>
      <Text style={[styles.text, { color: textColors[variant], fontSize: sizeStyles[size].fontSize }, textStyle]}>
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
  },
  text: {
    fontWeight: '600',
  },
});
