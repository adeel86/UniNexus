import { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { colors, spacing, typography, borderRadius } from '../config/theme';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, Avatar, Badge, Button } from '../components/ui';
import type { Course } from '../config/types';

interface EnrolledCourse extends Course {
  hasAIAccess: boolean;
  instructor: {
    id: number;
    displayName: string | null;
    firstName: string | null;
    lastName: string | null;
    avatarUrl: string | null;
  };
}

export default function CoursesScreen() {
  const { currentUser } = useAuth();
  const navigation = useNavigation<any>();
  const [refreshing, setRefreshing] = useState(false);

  const isTeacher = currentUser?.role === 'teacher';

  const { data: enrolledCourses = [], refetch: refetchEnrolled } = useQuery<EnrolledCourse[]>({
    queryKey: ['/api/me/enrolled-courses'],
    enabled: !isTeacher,
  });

  const { data: teacherCourses = [], refetch: refetchTeacher } = useQuery<Course[]>({
    queryKey: ['/api/teacher/courses'],
    enabled: isTeacher,
  });

  const courses = isTeacher ? teacherCourses : enrolledCourses;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (isTeacher) {
      await refetchTeacher();
    } else {
      await refetchEnrolled();
    }
    setRefreshing(false);
  }, [isTeacher, refetchTeacher, refetchEnrolled]);

  const renderCourseCard = ({ item: course }: { item: EnrolledCourse | Course }) => {
    const enrolledCourse = course as EnrolledCourse;
    const instructorName = enrolledCourse.instructor
      ? enrolledCourse.instructor.displayName ||
        `${enrolledCourse.instructor.firstName} ${enrolledCourse.instructor.lastName}`
      : 'Unknown Instructor';

    return (
      <Card style={styles.courseCard}>
        <CardContent>
          <TouchableOpacity
            onPress={() => navigation.navigate('CourseDetail', { courseId: course.id })}
          >
            <View style={styles.courseHeader}>
              <View style={styles.courseInfo}>
                <Text style={styles.courseTitle} numberOfLines={2}>
                  {course.title}
                </Text>
                {course.code && (
                  <Badge variant="outline" size="sm" style={styles.codeTag}>
                    {course.code}
                  </Badge>
                )}
              </View>
              <View style={styles.statusIndicator}>
                {course.isValidated ? (
                  <Ionicons name="checkmark-circle" size={24} color={colors.success} />
                ) : (
                  <Ionicons name="time" size={24} color={colors.warning} />
                )}
              </View>
            </View>

            {course.description && (
              <Text style={styles.courseDescription} numberOfLines={2}>
                {course.description}
              </Text>
            )}

            {!isTeacher && enrolledCourse.instructor && (
              <View style={styles.instructorRow}>
                <Avatar
                  uri={enrolledCourse.instructor.avatarUrl}
                  name={instructorName}
                  size="sm"
                />
                <Text style={styles.instructorName}>{instructorName}</Text>
              </View>
            )}

            <View style={styles.courseFooter}>
              <View style={styles.materialCount}>
                <Ionicons name="document-text-outline" size={16} color={colors.textSecondary} />
                <Text style={styles.materialText}>
                  {course.materialCount || 0} materials
                </Text>
              </View>

              {!isTeacher && enrolledCourse.hasAIAccess && (
                <Button
                  title="Ask AI"
                  size="sm"
                  icon={<Ionicons name="sparkles" size={16} color={colors.textLight} />}
                  onPress={() =>
                    navigation.navigate('AskTeacherAI', {
                      courseId: course.id,
                      courseTitle: course.title,
                    })
                  }
                />
              )}
            </View>
          </TouchableOpacity>
        </CardContent>
      </Card>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={colors.gradient.full}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View>
          <Text style={styles.headerTitle}>
            {isTeacher ? 'My Courses' : 'Enrolled Courses'}
          </Text>
          <Text style={styles.headerSubtitle}>
            {courses.length} {courses.length === 1 ? 'course' : 'courses'}
          </Text>
        </View>
      </LinearGradient>

      <FlatList
        data={courses}
        renderItem={renderCourseCard}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="book-outline" size={64} color={colors.textTertiary} />
            <Text style={styles.emptyTitle}>
              {isTeacher ? 'No courses created' : 'No enrolled courses'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {isTeacher
                ? 'Create courses from the web platform'
                : 'Get validated to access course materials'}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    paddingTop: spacing.sm,
  },
  headerTitle: {
    ...typography.h2,
    color: colors.textLight,
  },
  headerSubtitle: {
    ...typography.bodySmall,
    color: colors.textLight,
    opacity: 0.9,
    marginTop: 4,
  },
  listContent: {
    padding: spacing.md,
    flexGrow: 1,
  },
  courseCard: {
    marginBottom: spacing.md,
  },
  courseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  courseInfo: {
    flex: 1,
    gap: spacing.sm,
  },
  courseTitle: {
    ...typography.h4,
    color: colors.text,
  },
  codeTag: {
    alignSelf: 'flex-start',
  },
  statusIndicator: {},
  courseDescription: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  instructorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  instructorName: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  courseFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  materialCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  materialText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  emptyTitle: {
    ...typography.h4,
    color: colors.text,
    marginTop: spacing.lg,
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
