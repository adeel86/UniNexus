import { View, Image, Text, StyleSheet } from 'react-native';
import { colors, borderRadius } from '../../config/theme';

interface AvatarProps {
  uri?: string | null;
  name?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Avatar({ uri, name, size = 'md' }: AvatarProps) {
  const sizes = {
    sm: 32,
    md: 40,
    lg: 56,
    xl: 80,
  };

  const fontSizes = {
    sm: 12,
    md: 16,
    lg: 22,
    xl: 32,
  };

  const dimension = sizes[size];
  const fontSize = fontSizes[size];

  const getInitials = (name: string | null | undefined) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={[
          styles.avatar,
          {
            width: dimension,
            height: dimension,
            borderRadius: dimension / 2,
          },
        ]}
      />
    );
  }

  return (
    <View
      style={[
        styles.fallback,
        {
          width: dimension,
          height: dimension,
          borderRadius: dimension / 2,
        },
      ]}
    >
      <Text style={[styles.initials, { fontSize }]}>{getInitials(name)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    backgroundColor: colors.surface,
  },
  fallback: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: colors.textLight,
    fontWeight: '600',
  },
});
