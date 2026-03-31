import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TrendingUp, TrendingDown, Users, Award, Target, AlertTriangle,
  Trophy, GraduationCap, FileCheck, Briefcase, MessageSquare, CheckCircle,
  BookOpen, Loader2, Sparkles, MessageCircle, Trash2, Search, Plus,
  Megaphone, Star, Medal,
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { UniversalFeed } from "@/components/UniversalFeed";
import { CreatePostModal } from "@/components/CreatePostModal";
import { CreateAnnouncementModal } from "@/components/CreateAnnouncementModal";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/AuthContext";
import { formatDistanceToNow } from "date-fns";
import {
  useUniversityDashboard,
  ValidateCourseDialog,
  RejectCourseDialog,
  PendingCourseCard,
} from "@/components/university";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { UserAvatar } from "@/components/UserAvatar";

const TIER_COLORS: Record<string, string> = {
  platinum: "bg-gradient-to-r from-purple-400 to-indigo-400 text-white",
  gold: "bg-gradient-to-r from-yellow-400 to-amber-400 text-white",
  silver: "bg-gradient-to-r from-gray-300 to-gray-400 text-gray-800",
  bronze: "bg-gradient-to-r from-orange-300 to-amber-500 text-white",
};

function DeltaBadge({ delta }: { delta: number }) {
  if (delta === 0) {
    return <span className="text-xs text-muted-foreground">No change this month</span>;
  }
  const positive = delta > 0;
  return (
    <div className={`flex items-center text-xs ${positive ? "text-green-600" : "text-red-500"}`}>
      {positive ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
      {positive ? "+" : ""}{delta}% from last month
    </div>
  );
}

export default function UniversityDashboard() {
  const { toast } = useToast();
  const { userData: currentUser } = useAuth();
  const [userSearch, setUserSearch] = useState("");
  const [createPostOpen, setCreatePostOpen] = useState(false);
  const [createAnnouncementOpen, setCreateAnnouncementOpen] = useState(false);
  const [postInitialValues, setPostInitialValues] = useState({
    content: "",
    category: "social",
    tags: ""
  });
  const {
    retentionData,
    isRetentionLoading,
    careerData,
    isCareerLoading,
    coursesStats,
    isCoursesStatsLoading,
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
  } = useUniversityDashboard() as any;

  const { data: students = [], isLoading: isStudentsLoading } = useQuery<any[]>({
    queryKey: ["/api/students"],
  });

  const { data: teachers = [], isLoading: isTeachersLoading } = useQuery<any[]>({
    queryKey: ["/api/university/teachers"],
  });

  // Announcements are now scoped at the backend — no client-side filtering needed
  const { data: announcements = [], isLoading: isAnnouncementsLoading } = useQuery<any[]>({
    queryKey: ["/api/announcements"],
    select: (data: any[]) => data.slice(0, 5),
  });

  const removeUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest("DELETE", `/api/university/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/students"] });
      queryClient.invalidateQueries({ queryKey: ["/api/university/teachers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/university/retention/overview"] });
      toast({
        title: "User removed",
        description: "The user has been permanently deleted from the university system.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Removal failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const filteredStudents = students.filter((s: any) =>
    `${s.firstName} ${s.lastName}`.toLowerCase().includes(userSearch.toLowerCase()) ||
    s.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  const filteredTeachers = teachers.filter((t: any) =>
    `${t.firstName} ${t.lastName}`.toLowerCase().includes(userSearch.toLowerCase()) ||
    t.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  const handleCreatePost = () => {
    setPostInitialValues({ content: "", category: "social", tags: "" });
    setCreatePostOpen(true);
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="font-heading text-3xl font-bold mb-2">University Dashboard</h1>
        <p className="text-muted-foreground">
          {currentUser?.university
            ? `Showing data for ${currentUser.university}`
            : "Monitor institutional engagement, retention metrics, and engage with the community"}
        </p>
      </div>

      <Tabs defaultValue="feed" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 max-w-2xl">
          <TabsTrigger value="feed" data-testid="tab-feed">
            <MessageSquare className="h-4 w-4 mr-2" />
            Feed
          </TabsTrigger>
          <TabsTrigger value="analytics" data-testid="tab-analytics">
            <TrendingUp className="h-4 w-4 mr-2" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="users" data-testid="tab-user-management">
            <Users className="h-4 w-4 mr-2" />
            Users
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
        </TabsList>

        {/* ── USER MANAGEMENT ─────────────────────────────────────────────── */}
        <TabsContent value="users">
          <Card className="p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <h2 className="font-heading text-xl font-semibold">User Management</h2>
              <div className="relative max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search students or teachers..."
                  className="pl-8"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  data-testid="input-user-search"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <h3 className="font-heading font-medium mb-4 flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-purple-600" />
                  Students ({filteredStudents.length})
                </h3>
                {isStudentsLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="animate-spin" /></div>
                ) : (
                  <div className="space-y-3">
                    {filteredStudents.length === 0 ? (
                      <p className="text-sm text-muted-foreground italic">No students found</p>
                    ) : (
                      filteredStudents.map((student: any) => (
                        <div key={student.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <UserAvatar user={student} size="sm" />
                            <div>
                              <div className="font-medium text-sm">{student.firstName} {student.lastName}</div>
                              <div className="text-xs text-muted-foreground">{student.email}</div>
                              {student.major && (
                                <div className="text-xs text-muted-foreground">{student.major}</div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={`text-xs capitalize ${TIER_COLORS[student.rankTier] || TIER_COLORS.bronze}`}>
                              {student.rankTier}
                            </Badge>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-destructive" data-testid={`button-remove-student-${student.id}`}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Remove student permanently?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will completely delete {student.firstName}'s account and all their data from UniNexus.
                                    This action is permanent and cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => removeUserMutation.mutate(student.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div>
                <h3 className="font-heading font-medium mb-4 flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-600" />
                  Teachers ({filteredTeachers.length})
                </h3>
                {isTeachersLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="animate-spin" /></div>
                ) : (
                  <div className="space-y-3">
                    {filteredTeachers.length === 0 ? (
                      <p className="text-sm text-muted-foreground italic">No teachers found</p>
                    ) : (
                      filteredTeachers.map((teacher: any) => (
                        <div key={teacher.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <UserAvatar user={teacher} size="sm" />
                            <div>
                              <div className="font-medium text-sm">{teacher.firstName} {teacher.lastName}</div>
                              <div className="text-xs text-muted-foreground">{teacher.email}</div>
                            </div>
                          </div>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-destructive" data-testid={`button-remove-teacher-${teacher.id}`}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remove teacher permanently?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will completely delete {teacher.firstName}'s account and all their data from UniNexus.
                                  This action is permanent and cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => removeUserMutation.mutate(teacher.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* ── FEED ────────────────────────────────────────────────────────── */}
        <TabsContent value="feed">
          <Tabs defaultValue="for-you" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="for-you" className="gap-2">
                <Sparkles className="h-4 w-4" />
                For You
              </TabsTrigger>
              <TabsTrigger value="my-posts" className="gap-2">
                <MessageCircle className="h-4 w-4" />
                My Posts
              </TabsTrigger>
            </TabsList>
            <TabsContent value="for-you">
              <UniversalFeed role="university" initialCategory="all" feedType="personalized" />
            </TabsContent>
            <TabsContent value="my-posts">
              <Button
                onClick={() => setCreatePostOpen(true)}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold mb-4"
                size="lg"
                data-testid="button-create-post"
              >
                <Plus className="mr-2 h-5 w-5" />
                Share Something Amazing
              </Button>
              <UniversalFeed role="university" showOnlyOwnPosts={true} feedType="my-posts" />
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* ── COURSE VALIDATIONS ──────────────────────────────────────────── */}
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
                {pendingCourses.map((course: any) => (
                  <PendingCourseCard
                    key={course.id}
                    course={course}
                    onApprove={openValidateDialog}
                    onReject={openRejectDialog}
                    isApproving={validateCourseMutation.isPending}
                    isRejecting={rejectCourseMutation.isPending}
                  />
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* ── ANALYTICS ───────────────────────────────────────────────────── */}
        <TabsContent value="analytics">

          {/* ── Stat Cards ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card className="p-6" data-testid="stat-card-total-students">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-muted-foreground">Total Students</div>
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div className="text-3xl font-bold mb-1" data-testid="metric-total-students">{totalStudents}</div>
              <DeltaBadge delta={monthOverMonth?.totalStudentsDelta ?? 0} />
            </Card>

            <Card className="p-6" data-testid="stat-card-active-students">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-muted-foreground">Active Students</div>
                <Target className="h-5 w-5 text-green-600" />
              </div>
              <div className="text-3xl font-bold mb-1" data-testid="metric-active-students">{activeStudents}</div>
              <div className="text-xs text-muted-foreground">
                {engagementRate}% engagement rate
              </div>
            </Card>

            <Card className="p-6" data-testid="stat-card-avg-engagement">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-muted-foreground">Avg Engagement</div>
                <Award className="h-5 w-5 text-blue-600" />
              </div>
              <div className="text-3xl font-bold mb-1" data-testid="metric-avg-engagement">{avgEngagement}</div>
              <DeltaBadge delta={monthOverMonth?.avgEngagementDelta ?? 0} />
            </Card>

            <Card className="p-6" data-testid="stat-card-at-risk">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-muted-foreground">At-Risk Students</div>
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div className="text-3xl font-bold mb-1" data-testid="metric-at-risk">{atRiskStudents}</div>
              <div className="flex items-center text-xs text-red-600">
                <TrendingDown className="h-3 w-3 mr-1" />
                Engagement score &lt; 30
              </div>
            </Card>
          </div>

          {/* ── Course Enrollment Stats ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="p-6" data-testid="stat-card-course-enrollments">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-muted-foreground">Courses Enrolled</div>
                <BookOpen className="h-5 w-5 text-indigo-600" />
              </div>
              {isCoursesStatsLoading ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <div className="text-3xl font-bold mb-1" data-testid="metric-total-enrollments">
                    {coursesStats?.totalEnrollments ?? 0}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {coursesStats?.studentsEnrolled ?? 0} students enrolled
                    ({coursesStats?.enrollmentRate ?? 0}% of total)
                  </div>
                </>
              )}
            </Card>

            <Card className="p-6" data-testid="stat-card-course-completion">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-muted-foreground">Course Completions</div>
                <FileCheck className="h-5 w-5 text-green-600" />
              </div>
              {isCoursesStatsLoading ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <div className="text-3xl font-bold mb-1" data-testid="metric-completed-courses">
                    {coursesStats?.completed ?? 0}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {coursesStats?.completionRate ?? 0}% completion rate
                  </div>
                </>
              )}
            </Card>

            <Card className="p-6" data-testid="stat-card-active-enrollments">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-muted-foreground">Currently Active</div>
                <Briefcase className="h-5 w-5 text-purple-600" />
              </div>
              {isCoursesStatsLoading ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <div className="text-3xl font-bold mb-1" data-testid="metric-active-enrollments">
                    {coursesStats?.activeEnrollments ?? 0}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Active course enrollments
                  </div>
                </>
              )}
            </Card>
          </div>

          {/* ── Charts ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <Card className="p-6">
              <h3 className="font-heading font-semibold text-lg mb-4">Engagement Trend</h3>
              {engagementData.length === 0 ? (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">
                  No trend data yet
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={engagementData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="active" name="Active" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="total" name="Total" stroke="#ec4899" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </Card>

            <Card className="p-6">
              <h3 className="font-heading font-semibold text-lg mb-4">Retention by Department</h3>
              {departmentRetentionData.length === 0 ? (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">
                  No department data yet
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={departmentRetentionData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="department" />
                    <YAxis unit="%" />
                    <Tooltip formatter={(v: any) => `${v}%`} />
                    <Bar dataKey="retention" name="Retention %" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>
          </div>

          <ChallengeMetricsSection retentionData={retentionData} isLoading={isRetentionLoading} />
          <CareerPathwaySection careerData={careerData} isLoading={isCareerLoading} />

          {/* ── Announcements ── */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-semibold text-lg">Recent Announcements</h3>
              <Button
                onClick={() => setCreateAnnouncementOpen(true)}
                data-testid="button-create-announcement"
              >
                Create Announcement
              </Button>
            </div>
            {isAnnouncementsLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : announcements.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Megaphone className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No announcements yet</p>
                <p className="text-xs mt-1">Create your first announcement to notify students</p>
              </div>
            ) : (
              <div className="space-y-3">
                {announcements.map((announcement: any, idx: number) => (
                  <div
                    key={announcement.id}
                    className={`border-l-4 ${idx % 2 === 0 ? 'border-primary' : 'border-blue-500'} pl-4 py-2`}
                    data-testid={`announcement-${announcement.id}`}
                  >
                    <div className="font-medium">{announcement.title}</div>
                    {announcement.content && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
                        {announcement.content}
                      </p>
                    )}
                    <div className="text-xs text-muted-foreground mt-1">
                      {announcement.createdAt
                        ? `Posted ${formatDistanceToNow(new Date(announcement.createdAt), { addSuffix: true })}`
                        : 'Recently posted'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      <ValidateCourseDialog
        open={validateDialogOpen}
        onOpenChange={setValidateDialogOpen}
        selectedCourse={selectedCourse}
        validationNote={validationNote}
        onValidationNoteChange={setValidationNote}
        onValidate={handleValidate}
        isPending={validateCourseMutation.isPending}
      />

      <RejectCourseDialog
        open={rejectDialogOpen}
        onOpenChange={setRejectDialogOpen}
        selectedCourse={selectedCourse}
        rejectionReason={rejectionReason}
        onRejectionReasonChange={setRejectionReason}
        onReject={handleReject}
        isPending={rejectCourseMutation.isPending}
      />

      <CreatePostModal
        open={createPostOpen}
        onOpenChange={setCreatePostOpen}
        initialContent={postInitialValues.content}
        initialCategory={postInitialValues.category}
        initialTags={postInitialValues.tags}
      />

      <CreateAnnouncementModal
        open={createAnnouncementOpen}
        onOpenChange={setCreateAnnouncementOpen}
      />
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function ChallengeMetricsSection({ retentionData, isLoading }: { retentionData: any; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="mb-6">
        <h2 className="font-heading text-2xl font-bold mb-4">Challenge Participation Metrics</h2>
        <div className="text-center py-8 text-muted-foreground">Loading challenge metrics...</div>
      </div>
    );
  }

  if (!retentionData) {
    return (
      <div className="mb-6">
        <h2 className="font-heading text-2xl font-bold mb-4">Challenge Participation Metrics</h2>
        <div className="text-center py-8 text-muted-foreground">No challenge data available</div>
      </div>
    );
  }

  const { overview, badgeProgress, participationByCategory } = retentionData;
  const badgeData = [
    { name: "No badges", value: badgeProgress?.none || 0, color: "#6b7280" },
    { name: "1–2 badges", value: badgeProgress?.low || 0, color: "#3b82f6" },
    { name: "3–5 badges", value: badgeProgress?.medium || 0, color: "#8b5cf6" },
    { name: "6+ badges", value: badgeProgress?.high || 0, color: "#ec4899" },
  ];
  const categoryData = Object.entries(participationByCategory || {}).map(([cat, count]) => ({
    category: cat.charAt(0).toUpperCase() + cat.slice(1),
    count: count as number,
  }));

  return (
    <div className="mb-6">
      <h2 className="font-heading text-2xl font-bold mb-4">Challenge Participation Metrics</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="p-6">
          <div className="text-sm text-muted-foreground mb-1">Total Students</div>
          <div className="text-3xl font-bold" data-testid="metric-challenge-total-students">{overview?.totalStudents ?? 0}</div>
        </Card>
        <Card className="p-6">
          <div className="text-sm text-muted-foreground mb-1">Participating Students</div>
          <div className="text-3xl font-bold text-purple-600" data-testid="metric-participating-students">{overview?.participatingStudents ?? 0}</div>
          <div className="text-xs text-muted-foreground">{overview?.participationRate ?? 0}% participation rate</div>
        </Card>
        <Card className="p-6">
          <div className="text-sm text-muted-foreground mb-1">Active Challenges</div>
          <div className="text-3xl font-bold text-blue-600" data-testid="metric-active-challenges">{overview?.activeChallenges ?? 0}</div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="font-heading font-semibold mb-4">Badge Progress Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={badgeData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}>
                {badgeData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <h3 className="font-heading font-semibold mb-4">Participation by Category</h3>
          {categoryData.length === 0 ? (
            <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">
              No category data yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" name="Students" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>
    </div>
  );
}

function CareerPathwaySection({ careerData, isLoading }: { careerData: any; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="mb-6">
        <h2 className="font-heading text-2xl font-bold mb-4">Career Pathway Metrics</h2>
        <div className="text-center py-8 text-muted-foreground">Loading career metrics...</div>
      </div>
    );
  }

  if (!careerData) {
    return (
      <div className="mb-6">
        <h2 className="font-heading text-2xl font-bold mb-4">Career Pathway Metrics</h2>
        <div className="text-center py-8 text-muted-foreground">No career data available</div>
      </div>
    );
  }

  const { readiness, skills, certifications: certs } = careerData;
  const skillLevelData = Object.entries(skills?.byLevel || {}).map(([level, count]) => ({
    level: level.charAt(0).toUpperCase() + level.slice(1),
    count: count as number,
  }));
  const skillCategoryData = Object.entries(skills?.byCategory || {}).map(([cat, count]) => ({
    category: cat.charAt(0).toUpperCase() + cat.slice(1),
    count: count as number,
  }));

  return (
    <div className="mb-6">
      <h2 className="font-heading text-2xl font-bold mb-4">Career Pathway Metrics</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="p-6">
          <div className="text-sm text-muted-foreground mb-1">Avg AI Readiness Score</div>
          <div className="text-3xl font-bold text-purple-600" data-testid="metric-readiness-score">{readiness?.averageScore ?? 0}</div>
          <div className="text-xs text-muted-foreground mt-1">
            High: {readiness?.cohorts?.high ?? 0} · Mid: {readiness?.cohorts?.medium ?? 0} · Low: {readiness?.cohorts?.low ?? 0}
          </div>
        </Card>
        <Card className="p-6">
          <div className="text-sm text-muted-foreground mb-1">Total Skills</div>
          <div className="text-3xl font-bold text-blue-600" data-testid="metric-total-skills">{skills?.totalSkills ?? 0}</div>
        </Card>
        <Card className="p-6">
          <div className="text-sm text-muted-foreground mb-1">Certifications</div>
          <div className="text-3xl font-bold" data-testid="metric-certifications">{certs?.total ?? 0}</div>
          <div className="text-xs text-muted-foreground">
            {certs?.active ?? 0} currently active · {certs?.certificationRate ?? 0}% cert rate
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="font-heading font-semibold mb-4">Skills by Level</h3>
          {skillLevelData.length === 0 ? (
            <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">No skill data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={skillLevelData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="level" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" name="Students" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
        <Card className="p-6">
          <h3 className="font-heading font-semibold mb-4">Skills by Category</h3>
          {skillCategoryData.length === 0 ? (
            <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">No category data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={skillCategoryData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" name="Students" fill="#ec4899" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>
    </div>
  );
}
