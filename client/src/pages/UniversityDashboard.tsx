import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { User, Course } from "@shared/schema";
import { TrendingUp, TrendingDown, Users, Award, Target, AlertTriangle, Trophy, GraduationCap, FileCheck, Briefcase, MessageSquare, CheckCircle, XCircle, Clock, BookOpen, Loader2 } from "lucide-react";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { UniversalFeed } from "@/components/UniversalFeed";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState } from "react";
import { Link } from "wouter";

interface RetentionOverview {
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

interface CareerMetrics {
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

interface PendingCourse extends Course {
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

export default function UniversityDashboard() {
  const { toast } = useToast();
  
  // Dialog state
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

  // Fetch pending course validation requests
  const { data: pendingCourses = [], isLoading: isPendingLoading } = useQuery<PendingCourse[]>({
    queryKey: ["/api/university/pending-course-validations"],
  });

  // Validate course mutation
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

  // Reject course mutation
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

  const getInstructorName = (instructor: PendingCourse['instructor']) => {
    if (!instructor) return 'Unknown Instructor';
    return instructor.displayName || `${instructor.firstName || ''} ${instructor.lastName || ''}`.trim() || 'Unknown Instructor';
  };

  const getInstructorInitials = (instructor: PendingCourse['instructor']) => {
    const name = getInstructorName(instructor);
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const totalStudents = students.length;
  const activeStudents = students.filter(s => (s.engagementScore || 0) > 50).length;
  const avgEngagement = totalStudents > 0
    ? Math.round(students.reduce((sum, s) => sum + (s.engagementScore || 0), 0) / totalStudents)
    : 0;
  const atRiskStudents = students.filter(s => (s.engagementScore || 0) < 30).length;
  const engagementRate = totalStudents > 0 ? Math.round((activeStudents / totalStudents) * 100) : 0;

  // Mock engagement data
  const engagementData = [
    { month: "Jan", active: 245, total: 320 },
    { month: "Feb", active: 268, total: 325 },
    { month: "Mar", active: 289, total: 330 },
    { month: "Apr", active: 312, total: 340 },
    { month: "May", active: 298, total: 338 },
    { month: "Jun", active: 325, total: 350 },
  ];

  const departmentRetentionData = [
    { department: "CS", retention: 94 },
    { department: "Math", retention: 88 },
    { department: "Physics", retention: 91 },
    { department: "Chem", retention: 85 },
    { department: "Bio", retention: 89 },
  ];

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="font-heading text-3xl font-bold mb-2">University Dashboard</h1>
        <p className="text-muted-foreground">
          Monitor institutional engagement, retention metrics, and engage with the community
        </p>
      </div>

      <Tabs defaultValue="analytics" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 max-w-lg">
          <TabsTrigger value="analytics" data-testid="tab-analytics">
            <TrendingUp className="h-4 w-4 mr-2" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="validations" data-testid="tab-course-validations">
            <CheckCircle className="h-4 w-4 mr-2" />
            Course Validations
            {pendingCourses.length > 0 && (
              <Badge variant="destructive" className="ml-2 text-xs">
                {pendingCourses.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="feed" data-testid="tab-feed">
            <MessageSquare className="h-4 w-4 mr-2" />
            Feed
          </TabsTrigger>
        </TabsList>

        <TabsContent value="feed">
          <UniversalFeed role="university" initialCategory="all" />
        </TabsContent>

        {/* Course Validation Tab */}
        <TabsContent value="validations">
          <Card className="p-6">
            <div className="flex items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-purple-600" />
                <h2 className="font-heading text-xl font-semibold">Pending Course Validations</h2>
              </div>
              {pendingCourses.length > 0 && (
                <Badge variant="secondary">
                  {pendingCourses.length} awaiting review
                </Badge>
              )}
            </div>

            {isPendingLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : pendingCourses.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">No pending validation requests</p>
                <p className="text-sm mt-1">
                  When teachers request course validation, they will appear here for review
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingCourses.map((course) => (
                  <div
                    key={course.id}
                    className="border rounded-md p-4 space-y-4"
                    data-testid={`pending-course-${course.id}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <h3 className="font-semibold text-lg">{course.name}</h3>
                          <Badge variant="outline">{course.code}</Badge>
                          <Badge variant="secondary" className="text-xs">
                            <Clock className="h-3 w-3 mr-1" />
                            Pending Review
                          </Badge>
                        </div>
                        
                        {course.description && (
                          <p className="text-sm text-muted-foreground mb-3">
                            {course.description}
                          </p>
                        )}

                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          {course.semester && (
                            <span>Semester: {course.semester}</span>
                          )}
                          {course.university && (
                            <span>University: {course.university}</span>
                          )}
                          {course.createdAt && (
                            <span>
                              Requested: {new Date(course.createdAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Instructor Info */}
                      {course.instructor && (
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={course.instructor.profileImageUrl || undefined} />
                            <AvatarFallback>
                              {getInstructorInitials(course.instructor)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="text-right">
                            <Link href={`/profile/${course.instructor.id}`}>
                              <span className="font-medium hover:underline cursor-pointer">
                                {getInstructorName(course.instructor)}
                              </span>
                            </Link>
                            {course.instructor.email && (
                              <p className="text-xs text-muted-foreground">{course.instructor.email}</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Validation Note from Teacher */}
                    {course.universityValidationNote && (
                      <div className="bg-muted p-3 rounded-md text-sm">
                        <span className="font-medium">Teacher's Note: </span>
                        <span>{course.universityValidationNote}</span>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex items-center justify-end gap-2 pt-3 border-t">
                      <Button
                        variant="outline"
                        onClick={() => openRejectDialog(course)}
                        disabled={rejectCourseMutation.isPending}
                        data-testid={`button-reject-course-${course.id}`}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Reject
                      </Button>
                      <Button
                        onClick={() => openValidateDialog(course)}
                        disabled={validateCourseMutation.isPending}
                        data-testid={`button-approve-course-${course.id}`}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Approve
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-muted-foreground">Total Students</div>
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div className="text-3xl font-bold mb-1">{totalStudents}</div>
          <div className="flex items-center text-xs text-green-600">
            <TrendingUp className="h-3 w-3 mr-1" />
            +5.2% from last month
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-muted-foreground">Active Students</div>
            <Target className="h-5 w-5 text-green-600" />
          </div>
          <div className="text-3xl font-bold mb-1">{activeStudents}</div>
          <div className="text-xs text-muted-foreground">
            {engagementRate}% engagement rate
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-muted-foreground">Avg Engagement</div>
            <Award className="h-5 w-5 text-blue-600" />
          </div>
          <div className="text-3xl font-bold mb-1">{avgEngagement}</div>
          <div className="flex items-center text-xs text-green-600">
            <TrendingUp className="h-3 w-3 mr-1" />
            +12.5% from last month
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-muted-foreground">At-Risk Students</div>
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </div>
          <div className="text-3xl font-bold mb-1">{atRiskStudents}</div>
          <div className="flex items-center text-xs text-red-600">
            <TrendingDown className="h-3 w-3 mr-1" />
            Needs attention
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Engagement Trend */}
        <Card className="p-6">
          <h3 className="font-heading font-semibold text-lg mb-4">Engagement Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={engagementData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="active" stroke="#8b5cf6" strokeWidth={2} />
              <Line type="monotone" dataKey="total" stroke="#ec4899" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Retention by Department */}
        <Card className="p-6">
          <h3 className="font-heading font-semibold text-lg mb-4">Retention by Department</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={departmentRetentionData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="department" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="retention" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Challenge Participation Metrics */}
      <div className="mb-6">
        <h2 className="font-heading text-2xl font-bold mb-4">Challenge Participation Metrics</h2>
        {isRetentionLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading challenge metrics...</div>
        ) : retentionData ? (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Card className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm text-muted-foreground">Active Challenges</div>
                  <Trophy className="h-5 w-5 text-primary" />
                </div>
                <div className="text-3xl font-bold mb-1" data-testid="metric-active-challenges">
                  {retentionData.overview.activeChallenges}
                </div>
                <div className="text-xs text-muted-foreground">Currently ongoing</div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm text-muted-foreground">Participating Students</div>
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div className="text-3xl font-bold mb-1" data-testid="metric-participating-students">
                  {retentionData.overview.participatingStudents}
                </div>
                <div className="text-xs text-muted-foreground">
                  {retentionData.overview.participationRate}% of total students
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm text-muted-foreground">Participation Rate</div>
                  <Target className="h-5 w-5 text-green-600" />
                </div>
                <div className="text-3xl font-bold mb-1" data-testid="metric-participation-rate">
                  {retentionData.overview.participationRate}%
                </div>
                <div className="flex items-center text-xs text-green-600">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  Retention indicator
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm text-muted-foreground">Badge Progress</div>
                  <Award className="h-5 w-5 text-yellow-600" />
                </div>
                <div className="text-3xl font-bold mb-1" data-testid="metric-badge-achievers">
                  {retentionData.badgeProgress.medium + retentionData.badgeProgress.high}
                </div>
                <div className="text-xs text-muted-foreground">Students with 3+ badges</div>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Engagement Trend */}
              <Card className="p-6">
                <h3 className="font-heading font-semibold text-lg mb-4">Challenge Engagement Trend</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={retentionData.engagementTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="participants" stroke="#8b5cf6" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </Card>

              {/* Badge Progress Distribution */}
              <Card className="p-6">
                <h3 className="font-heading font-semibold text-lg mb-4">Badge Progress Distribution</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'No Badges', value: retentionData.badgeProgress.none, color: '#ef4444' },
                        { name: '1-2 Badges', value: retentionData.badgeProgress.low, color: '#f59e0b' },
                        { name: '3-5 Badges', value: retentionData.badgeProgress.medium, color: '#10b981' },
                        { name: '6+ Badges', value: retentionData.badgeProgress.high, color: '#8b5cf6' },
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.name}: ${entry.value}`}
                      outerRadius={100}
                      dataKey="value"
                    >
                      {[
                        { color: '#ef4444' },
                        { color: '#f59e0b' },
                        { color: '#10b981' },
                        { color: '#8b5cf6' },
                      ].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </Card>

              {/* Participation by Category */}
              <Card className="p-6 lg:col-span-2">
                <h3 className="font-heading font-semibold text-lg mb-4">Challenge Participation by Category</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={Object.entries(retentionData.participationByCategory).map(([category, count]) => ({
                      category: category.charAt(0).toUpperCase() + category.slice(1),
                      count,
                    }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="category" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-muted-foreground">No challenge data available</div>
        )}
      </div>

      {/* Career Pathway Insights */}
      <div className="mb-6">
        <h2 className="font-heading text-2xl font-bold mb-4">Career Pathway Insights</h2>
        {isCareerLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading career metrics...</div>
        ) : careerData ? (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Card className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm text-muted-foreground">AI Readiness Score</div>
                  <Briefcase className="h-5 w-5 text-primary" />
                </div>
                <div className="text-3xl font-bold mb-1" data-testid="metric-readiness-score">
                  {careerData.readiness.averageScore}
                </div>
                <div className="text-xs text-muted-foreground">Average employability</div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm text-muted-foreground">Total Skills</div>
                  <GraduationCap className="h-5 w-5 text-blue-600" />
                </div>
                <div className="text-3xl font-bold mb-1" data-testid="metric-total-skills">
                  {careerData.skills.totalSkills}
                </div>
                <div className="text-xs text-muted-foreground">Across all students</div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm text-muted-foreground">Certifications Issued</div>
                  <FileCheck className="h-5 w-5 text-green-600" />
                </div>
                <div className="text-3xl font-bold mb-1" data-testid="metric-certifications">
                  {careerData.certifications.total}
                </div>
                <div className="text-xs text-muted-foreground">
                  {careerData.certifications.active} currently active
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm text-muted-foreground">Certification Rate</div>
                  <Award className="h-5 w-5 text-yellow-600" />
                </div>
                <div className="text-3xl font-bold mb-1" data-testid="metric-certification-rate">
                  {careerData.certifications.certificationRate}%
                </div>
                <div className="text-xs text-muted-foreground">Students with certificates</div>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Readiness Cohorts */}
              <Card className="p-6">
                <h3 className="font-heading font-semibold text-lg mb-4">Employability Readiness Cohorts</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Low Readiness', value: careerData.readiness.cohorts.low, color: '#ef4444' },
                        { name: 'Medium Readiness', value: careerData.readiness.cohorts.medium, color: '#f59e0b' },
                        { name: 'High Readiness', value: careerData.readiness.cohorts.high, color: '#10b981' },
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.name}: ${entry.value}`}
                      outerRadius={100}
                      dataKey="value"
                    >
                      {[
                        { color: '#ef4444' },
                        { color: '#f59e0b' },
                        { color: '#10b981' },
                      ].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </Card>

              {/* Skills by Level */}
              <Card className="p-6">
                <h3 className="font-heading font-semibold text-lg mb-4">Skills Distribution by Level</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={Object.entries(careerData.skills.byLevel).map(([level, count]) => ({
                      level: level.charAt(0).toUpperCase() + level.slice(1),
                      count,
                    }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="level" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              {/* Skills by Category */}
              <Card className="p-6 lg:col-span-2">
                <h3 className="font-heading font-semibold text-lg mb-4">Skills Distribution by Category</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={Object.entries(careerData.skills.byCategory).map(([category, count]) => ({
                      category: category.charAt(0).toUpperCase() + category.slice(1).replace('_', ' '),
                      count,
                    }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="category" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#ec4899" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-muted-foreground">No career pathway data available</div>
        )}
      </div>

      {/* Announcements */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading font-semibold text-lg">Recent Announcements</h3>
          <Button data-testid="button-create-announcement">Create Announcement</Button>
        </div>
        <div className="space-y-3">
          <div className="border-l-4 border-primary pl-4 py-2">
            <div className="font-medium">Welcome to the new semester!</div>
            <div className="text-sm text-muted-foreground">Posted 2 days ago</div>
          </div>
          <div className="border-l-4 border-blue-500 pl-4 py-2">
            <div className="font-medium">Career fair scheduled for next month</div>
            <div className="text-sm text-muted-foreground">Posted 1 week ago</div>
          </div>
        </div>
      </Card>
        </TabsContent>
      </Tabs>

      {/* Validate Course Dialog */}
      <Dialog open={validateDialogOpen} onOpenChange={setValidateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Course</DialogTitle>
            <DialogDescription>
              Validate this course to allow the instructor to upload materials and enable AI tutoring for enrolled students.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedCourse && (
              <div className="bg-muted p-3 rounded-md">
                <p className="font-medium">{selectedCourse.name}</p>
                <p className="text-sm text-muted-foreground">Code: {selectedCourse.code}</p>
                {selectedCourse.instructor && (
                  <p className="text-sm text-muted-foreground">
                    Instructor: {getInstructorName(selectedCourse.instructor)}
                  </p>
                )}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="validate-note">Approval Note (optional)</Label>
              <Textarea
                id="validate-note"
                value={validationNote}
                onChange={(e) => setValidationNote(e.target.value)}
                placeholder="Add a note for the instructor..."
                rows={3}
                data-testid="textarea-approval-note"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setValidateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleValidate}
              disabled={validateCourseMutation.isPending}
              data-testid="button-confirm-approve"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              {validateCourseMutation.isPending ? "Approving..." : "Approve Course"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Course Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Course</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting this course validation request. The instructor will be notified.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedCourse && (
              <div className="bg-muted p-3 rounded-md">
                <p className="font-medium">{selectedCourse.name}</p>
                <p className="text-sm text-muted-foreground">Code: {selectedCourse.code}</p>
                {selectedCourse.instructor && (
                  <p className="text-sm text-muted-foreground">
                    Instructor: {getInstructorName(selectedCourse.instructor)}
                  </p>
                )}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="reject-reason">Reason for Rejection</Label>
              <Textarea
                id="reject-reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explain why this course is being rejected..."
                rows={3}
                data-testid="textarea-rejection-reason"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={rejectCourseMutation.isPending}
              data-testid="button-confirm-reject"
            >
              <XCircle className="h-4 w-4 mr-2" />
              {rejectCourseMutation.isPending ? "Rejecting..." : "Reject Course"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
