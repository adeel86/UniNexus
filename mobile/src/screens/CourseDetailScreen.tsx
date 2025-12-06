import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { colors, spacing, typography } from '../config/theme';
import { Card, Badge, Button } from '../components/ui';
import type { RootStackParamList } from '../../App';

type CourseDetailRouteProp = RouteProp<RootStackParamList, 'CourseDetail'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type Material = {
  id: number;
  title: string;
  description?: string;
  fileType: string;
  fileUrl: string;
  createdAt: string;
};

type Course = {
  id: number;
  name: string;
  code: string;
  description?: string;
  instructorName?: string;
  university?: string;
  materials?: Material[];
  hasAI?: boolean;
};

export default function CourseDetailScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<CourseDetailRouteProp>();
  const { courseId } = route.params;
  const [activeTab, setActiveTab] = useState<'materials' | 'discussions'>('materials');

  const { data: course, isLoading } = useQuery<Course>({
    queryKey: ['/api/courses', courseId],
  });

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return 'document-text';
    if (fileType.includes('video')) return 'videocam';
    if (fileType.includes('image')) return 'image';
    if (fileType.includes('presentation') || fileType.includes('ppt')) return 'easel';
    return 'document';
  };

  const renderMaterial = ({ item }: { item: Material }) => (
    <TouchableOpacity style={styles.materialCard}>
      <View style={styles.materialIcon}>
        <Ionicons name={getFileIcon(item.fileType)} size={24} color={colors.primary} />
      </View>
      <View style={styles.materialInfo}>
        <Text style={styles.materialTitle}>{item.title}</Text>
        {item.description && (
          <Text style={styles.materialDesc} numberOfLines={2}>{item.description}</Text>
        )}
        <Text style={styles.materialMeta}>
          {item.fileType.split('/').pop()?.toUpperCase()}
        </Text>
      </View>
      <Ionicons name="download-outline" size={22} color={colors.textSecondary} />
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading course...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{course?.name || 'Course'}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Card style={styles.courseInfoCard}>
          <View style={styles.courseHeader}>
            <Badge variant="primary">{course?.code}</Badge>
            {course?.hasAI && (
              <Badge variant="secondary">AI Tutor Available</Badge>
            )}
          </View>
          <Text style={styles.courseName}>{course?.name}</Text>
          {course?.instructorName && (
            <Text style={styles.instructor}>
              <Ionicons name="person" size={14} color={colors.textSecondary} />
              {' '}{course.instructorName}
            </Text>
          )}
          {course?.university && (
            <Text style={styles.university}>
              <Ionicons name="school" size={14} color={colors.textSecondary} />
              {' '}{course.university}
            </Text>
          )}
          {course?.description && (
            <Text style={styles.description}>{course.description}</Text>
          )}

          {course?.hasAI && (
            <Button
              title="Ask Teacher's AI"
              onPress={() => navigation.navigate('AskTeacherAI', {
                courseId: course.id,
                courseName: course.name,
              })}
              variant="primary"
              icon={<Ionicons name="chatbubbles" size={18} color={colors.background} />}
              style={styles.aiButton}
            />
          )}
        </Card>

        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'materials' && styles.activeTab]}
            onPress={() => setActiveTab('materials')}
          >
            <Text style={[styles.tabText, activeTab === 'materials' && styles.activeTabText]}>
              Materials
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'discussions' && styles.activeTab]}
            onPress={() => setActiveTab('discussions')}
          >
            <Text style={[styles.tabText, activeTab === 'discussions' && styles.activeTabText]}>
              Discussions
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'materials' ? (
          <View style={styles.materialsContainer}>
            {course?.materials && course.materials.length > 0 ? (
              course.materials.map((material) => (
                <TouchableOpacity key={material.id} style={styles.materialCard}>
                  <View style={styles.materialIcon}>
                    <Ionicons name={getFileIcon(material.fileType)} size={24} color={colors.primary} />
                  </View>
                  <View style={styles.materialInfo}>
                    <Text style={styles.materialTitle}>{material.title}</Text>
                    {material.description && (
                      <Text style={styles.materialDesc} numberOfLines={2}>{material.description}</Text>
                    )}
                    <Text style={styles.materialMeta}>
                      {material.fileType.split('/').pop()?.toUpperCase()}
                    </Text>
                  </View>
                  <Ionicons name="download-outline" size={22} color={colors.textSecondary} />
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="folder-open-outline" size={48} color={colors.textMuted} />
                <Text style={styles.emptyText}>No materials uploaded yet</Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="chatbubbles-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyText}>Discussion feature coming soon</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: typography.body,
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
    flex: 1,
    fontSize: typography.lg,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginHorizontal: spacing.sm,
  },
  headerSpacer: {
    width: 32,
  },
  content: {
    flex: 1,
    padding: spacing.md,
  },
  courseInfoCard: {
    marginBottom: spacing.md,
  },
  courseHeader: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  courseName: {
    fontSize: typography.xl,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  instructor: {
    fontSize: typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  university: {
    fontSize: typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  description: {
    fontSize: typography.body,
    color: colors.text,
    lineHeight: 22,
    marginTop: spacing.sm,
  },
  aiButton: {
    marginTop: spacing.md,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.xs,
    marginBottom: spacing.md,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: 10,
  },
  activeTab: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: typography.body,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  activeTabText: {
    color: colors.background,
  },
  materialsContainer: {
    gap: spacing.sm,
  },
  materialCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.sm,
  },
  materialIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: `${colors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  materialInfo: {
    flex: 1,
  },
  materialTitle: {
    fontSize: typography.body,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  materialDesc: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  materialMeta: {
    fontSize: typography.xs,
    color: colors.textMuted,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyText: {
    fontSize: typography.body,
    color: colors.textMuted,
    marginTop: spacing.md,
  },
});
