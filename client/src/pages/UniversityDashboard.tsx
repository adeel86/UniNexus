import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown, Users, Award, Target, AlertTriangle, Trophy, GraduationCap, FileCheck, Briefcase, MessageSquare, CheckCircle, BookOpen, Loader2 } from "lucide-react";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { UniversalFeed } from "@/components/UniversalFeed";
import {
  useUniversityDashboard,
  ValidateCourseDialog,
  RejectCourseDialog,
  PendingCourseCard,
} from "@/components/university";

export default function UniversityDashboard() {
  const {
    retentionData,
    isRetentionLoading,
    careerData,
    isCareerLoading,
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
  } = useUniversityDashboard();

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
          <TabsTrigger value="feed" data-testid="tab-feed">
            <MessageSquare className="h-4 w-4 mr-2" />
            Feed
          </TabsTrigger>
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
        </TabsList>

        <TabsContent value="feed">
          <UniversalFeed role="university" initialCategory="all" />
        </TabsContent>

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

        <TabsContent value="analytics">
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

          <ChallengeMetricsSection retentionData={retentionData} isLoading={isRetentionLoading} />
          <CareerPathwaySection careerData={careerData} isLoading={isCareerLoading} />

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
    </div>
  );
}

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

  return (
    <div className="mb-6">
      <h2 className="font-heading text-2xl font-bold mb-4">Challenge Participation Metrics</h2>
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
    </div>
  );
}

function CareerPathwaySection({ careerData, isLoading }: { careerData: any; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="mb-6">
        <h2 className="font-heading text-2xl font-bold mb-4">Career Pathway Insights</h2>
        <div className="text-center py-8 text-muted-foreground">Loading career metrics...</div>
      </div>
    );
  }

  if (!careerData) {
    return (
      <div className="mb-6">
        <h2 className="font-heading text-2xl font-bold mb-4">Career Pathway Insights</h2>
        <div className="text-center py-8 text-muted-foreground">No career pathway data available</div>
      </div>
    );
  }

  return (
    <div className="mb-6">
      <h2 className="font-heading text-2xl font-bold mb-4">Career Pathway Insights</h2>
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
    </div>
  );
}
