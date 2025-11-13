import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";
import { TrendingUp, TrendingDown, Users, Award, Target, AlertTriangle, Trophy, GraduationCap, FileCheck, Briefcase } from "lucide-react";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

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

export default function UniversityDashboard() {
  const { data: students = [] } = useQuery<User[]>({
    queryKey: ["/api/students"],
  });

  const { data: retentionData, isLoading: isRetentionLoading } = useQuery<RetentionOverview>({
    queryKey: ["/api/university/retention/overview"],
  });

  const { data: careerData, isLoading: isCareerLoading } = useQuery<CareerMetrics>({
    queryKey: ["/api/university/retention/career"],
  });

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
          Monitor institutional engagement and retention metrics
        </p>
      </div>

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
    </div>
  );
}
