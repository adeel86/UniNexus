import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { colors, spacing, typography } from '../config/theme';
import { Avatar, Button, Card } from '../components/ui';
import { apiClient } from '../config/api';
import { useAuth } from '../contexts/AuthContext';
import type { RootStackParamList } from '../../App';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function EditProfileScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { currentUser, refreshUser } = useAuth();
  const queryClient = useQueryClient();

  const [displayName, setDisplayName] = useState(currentUser?.displayName || '');
  const [bio, setBio] = useState(currentUser?.bio || '');
  const [university, setUniversity] = useState(currentUser?.university || '');
  const [fieldOfStudy, setFieldOfStudy] = useState(currentUser?.fieldOfStudy || '');

  const updateMutation = useMutation({
    mutationFn: async (data: {
      displayName?: string;
      bio?: string;
      university?: string;
      fieldOfStudy?: string;
    }) => {
      return apiClient.patch('/api/me', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/me'] });
      refreshUser?.();
      Alert.alert('Success', 'Profile updated successfully', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to update profile');
    },
  });

  const handleSave = () => {
    if (!displayName.trim()) {
      Alert.alert('Error', 'Display name is required');
      return;
    }

    updateMutation.mutate({
      displayName: displayName.trim(),
      bio: bio.trim(),
      university: university.trim(),
      fieldOfStudy: fieldOfStudy.trim(),
    });
  };

  const handleChangePhoto = () => {
    Alert.alert(
      'Change Photo',
      'Choose an option',
      [
        { text: 'Take Photo', onPress: () => {} },
        { text: 'Choose from Library', onPress: () => {} },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <TouchableOpacity
            onPress={handleSave}
            style={styles.saveButton}
            disabled={updateMutation.isPending}
          >
            <Text style={[styles.saveText, updateMutation.isPending && styles.saveTextDisabled]}>
              {updateMutation.isPending ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.photoSection}>
            <Avatar
              uri={currentUser?.profileImageUrl}
              name={currentUser?.displayName || 'User'}
              size={100}
            />
            <TouchableOpacity onPress={handleChangePhoto} style={styles.changePhotoButton}>
              <Text style={styles.changePhotoText}>Change Photo</Text>
            </TouchableOpacity>
          </View>

          <Card style={styles.formCard}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Display Name</Text>
              <TextInput
                style={styles.input}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Enter your display name"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Bio</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={bio}
                onChangeText={setBio}
                placeholder="Tell us about yourself"
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                maxLength={300}
              />
              <Text style={styles.charCount}>{bio.length}/300</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>University</Text>
              <TextInput
                style={styles.input}
                value={university}
                onChangeText={setUniversity}
                placeholder="Enter your university"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Field of Study</Text>
              <TextInput
                style={styles.input}
                value={fieldOfStudy}
                onChangeText={setFieldOfStudy}
                placeholder="e.g., Computer Science"
                placeholderTextColor={colors.textMuted}
              />
            </View>
          </Card>

          <View style={styles.infoSection}>
            <View style={styles.infoItem}>
              <Ionicons name="mail" size={20} color={colors.textSecondary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}>{currentUser?.email}</Text>
              </View>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="person" size={20} color={colors.textSecondary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Username</Text>
                <Text style={styles.infoValue}>@{currentUser?.username}</Text>
              </View>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="shield-checkmark" size={20} color={colors.textSecondary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Role</Text>
                <Text style={styles.infoValue}>{currentUser?.role}</Text>
              </View>
            </View>
          </View>

          <Text style={styles.noteText}>
            Some information like email, username, and role cannot be changed here.
            Contact support if you need to update these.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    fontSize: typography.lg,
    fontWeight: '600',
    color: colors.text,
  },
  saveButton: {
    padding: spacing.xs,
  },
  saveText: {
    fontSize: typography.body,
    fontWeight: '600',
    color: colors.primary,
  },
  saveTextDisabled: {
    color: colors.textMuted,
  },
  content: {
    flex: 1,
    padding: spacing.md,
  },
  photoSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  changePhotoButton: {
    marginTop: spacing.md,
  },
  changePhotoText: {
    fontSize: typography.body,
    fontWeight: '600',
    color: colors.primary,
  },
  formCard: {
    marginBottom: spacing.lg,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: typography.sm,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.body,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textArea: {
    minHeight: 100,
    paddingTop: spacing.sm,
  },
  charCount: {
    fontSize: typography.xs,
    color: colors.textMuted,
    textAlign: 'right',
    marginTop: spacing.xs,
  },
  infoSection: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  infoContent: {
    marginLeft: spacing.md,
    flex: 1,
  },
  infoLabel: {
    fontSize: typography.xs,
    color: colors.textSecondary,
  },
  infoValue: {
    fontSize: typography.body,
    color: colors.text,
    marginTop: 2,
  },
  noteText: {
    fontSize: typography.sm,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.xl,
  },
});
