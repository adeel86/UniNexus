import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { User, Course } from "@shared/schema";

export interface RetentionOverview {
  overview: {
    totalStudents: number;
    participatingStudents: number;
    participationRate: number;
    activeChallenges: number;
  };
  badgeProgress: {
    none: number;
    low: number;
    medium: number;
    high: number;
  };
  participationByCategory: Record<string, number>;
  engagementTrend: Array<{ month: string; participants: number }>;
}

export interface CareerMetrics {
  readiness: {
    averageScore: number;
    cohorts: {
      low: number;
      medium: number;
      high: number;
    };
  };
  skills: {
    byLevel: Record<string, number>;
    byCategory: Record<string, number>;
    totalSkills: number;
  };
  certifications: {
    total: number;
    byType: Record<string, number>;
    active: number;
    certificationRate: number;
    studentsWithCertifications: number;
  };
}

export interface CoursesStats {
  totalEnrollments: number;
  activeEnrollments: number;
  completed: number;
  studentsEnrolled: number;
  completionRate: number;
  enrollmentRate: number;
}

export interface LeaderboardEntry {
  rank: number;
  id: string;
  firstName: string;
  lastName: string;
  displayName: string | null;
  profileImageUrl: string | null;
  major: string | null;
  totalPoints: number;
  rankTier: 'bronze' | 'silver' | 'gold' | 'platinum';
  engagementScore: number;
  problemSolverScore: number;
  challengePoints: number;
}

export interface PendingCourse extends Course {
  instructor: {
    id: string;
    displayName: string | null;
    firstName: string | null;
    lastName: string | null;
    profileImageUrl: string | null;
    university: string | null;
    email: string | null;
  } | null;
}

export function getInstructorName(instructor: PendingCourse['instructor']): string {
  if (!instructor) return 'Unknown Instructor';
  return instructor.displayName || `${instructor.firstName || ''} ${instructor.lastName || ''}`.trim() || 'Unknown Instructor';
}

export function getInstructorInitials(instructor: PendingCourse['instructor']): string {
  const name = getInstructorName(instructor);
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export function useUniversityDashboard() {
  const { toast } = useToast();
  
  const [validateDialogOpen, setValidateDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<PendingCourse | null>(null);
  const [validationNote, setValidationNote] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");

  const { data: students = [] } = useQuery<User[]>({
    queryKey: ["/api/students"],
  });

  const { data: retentionData, isLoading: isRetentionLoading } = useQuery<RetentionOverview>({
    queryKey: ["/api/university/retention/overview"],
  });

  const { data: careerData, isLoading: isCareerLoading } = useQuery<CareerMetrics>({
    queryKey: ["/api/university/retention/career"],
  });

  const { data: analyticsData, isLoading: isAnalyticsLoading } = useQuery<{
    engagementData: { month: string; total: number; active: number }[];
    departmentRetentionData: { department: string; retention: number }[];
    monthOverMonth: {
      totalStudentsDelta: number;
      activeStudentsDelta: number;
      avgEngagementDelta: number;
    };
  }>({
    queryKey: ["/api/university/analytics"],
  });

  const { data: coursesStats, isLoading: isCoursesStatsLoading } = useQuery<CoursesStats>({
    queryKey: ["/api/university/courses-stats"],
  });

  const { data: leaderboard = [], isLoading: isLeaderboardLoading } = useQuery<LeaderboardEntry[]>({
    queryKey: ["/api/university/leaderboard"],
  });

  const { data: pendingCourses = [], isLoading: isPendingLoading } = useQuery<PendingCourse[]>({
    queryKey: ["/api/university/pending-course-validations"],
  });

  const validateCourseMutation = useMutation({
    mutationFn: async ({ courseId, note }: { courseId: string; note?: string }) => {
      return apiRequest("POST", `/api/courses/${courseId}/university-validation`, { action: 'approve', note });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/university/pending-course-validations"] });
      toast({
        title: "Course validated!",
        description: "The teacher can now upload materials to this course.",
      });
      setValidateDialogOpen(false);
      setSelectedCourse(null);
      setValidationNote("");
    },
    onError: (error: any) => {
      toast({
        title: "Validation failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const rejectCourseMutation = useMutation({
    mutationFn: async ({ courseId, reason }: { courseId: string; reason?: string }) => {
      return apiRequest("POST", `/api/courses/${courseId}/university-validation`, { action: 'reject', note: reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/university/pending-course-validations"] });
      toast({
        title: "Course rejected",
        description: "The teacher has been notified about the rejection.",
      });
      setRejectDialogOpen(false);
      setSelectedCourse(null);
      setRejectionReason("");
    },
    onError: (error: any) => {
      toast({
        title: "Rejection failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const openValidateDialog = (course: PendingCourse) => {
    setSelectedCourse(course);
    setValidationNote("");
    setValidateDialogOpen(true);
  };

  const openRejectDialog = (course: PendingCourse) => {
    setSelectedCourse(course);
    setRejectionReason("");
    setRejectDialogOpen(true);
  };

  const handleValidate = () => {
    if (!selectedCourse) return;
    validateCourseMutation.mutate({
      courseId: selectedCourse.id,
      note: validationNote.trim() || undefined,
    });
  };

  const handleReject = () => {
    if (!selectedCourse) return;
    rejectCourseMutation.mutate({
      courseId: selectedCourse.id,
      reason: rejectionReason.trim() || undefined,
    });
  };

  const totalStudents = students.length;
  const activeStudents = students.filter(s => (s.engagementScore || 0) > 50).length;
  const avgEngagement = totalStudents > 0
    ? Math.round(students.reduce((sum, s) => sum + (s.engagementScore || 0), 0) / totalStudents)
    : 0;
  const atRiskStudents = students.filter(s => (s.engagementScore || 0) < 30).length;
  const engagementRate = totalStudents > 0 ? Math.round((activeStudents / totalStudents) * 100) : 0;

  const engagementData = analyticsData?.engagementData ?? [];
  const departmentRetentionData = analyticsData?.departmentRetentionData ?? [];
  const monthOverMonth = analyticsData?.monthOverMonth ?? { totalStudentsDelta: 0, activeStudentsDelta: 0, avgEngagementDelta: 0 };

  return {
    students,
    retentionData,
    isRetentionLoading,
    careerData,
    isCareerLoading,
    analyticsData,
    isAnalyticsLoading,
    coursesStats,
    isCoursesStatsLoading,
    leaderboard,
    isLeaderboardLoading,
    pendingCourses,
    isPendingLoading,
    validateDialogOpen,
    setValidateDialogOpen,
    rejectDialogOpen,
    setRejectDialogOpen,
    selectedCourse,
    validationNote,
    setValidationNote,
    rejectionReason,
    setRejectionReason,
    validateCourseMutation,
    rejectCourseMutation,
    openValidateDialog,
    openRejectDialog,
    handleValidate,
    handleReject,
    totalStudents,
    activeStudents,
    avgEngagement,
    atRiskStudents,
    engagementRate,
    engagementData,
    departmentRetentionData,
    monthOverMonth,
  };
}
