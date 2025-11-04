import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";
import { TrendingUp, TrendingDown, Users, Award, Target, AlertTriangle } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function UniversityDashboard() {
  const { data: students = [] } = useQuery<User[]>({
    queryKey: ["/api/students"],
  });

  const totalStudents = students.length;
  const activeStudents = students.filter(s => (s.engagementScore || 0) > 50).length;
  const avgEngagement = Math.round(
    students.reduce((sum, s) => sum + (s.engagementScore || 0), 0) / totalStudents || 0
  );
  const atRiskStudents = students.filter(s => (s.engagementScore || 0) < 30).length;

  // Mock engagement data
  const engagementData = [
    { month: "Jan", active: 245, total: 320 },
    { month: "Feb", active: 268, total: 325 },
    { month: "Mar", active: 289, total: 330 },
    { month: "Apr", active: 312, total: 340 },
    { month: "May", active: 298, total: 338 },
    { month: "Jun", active: 325, total: 350 },
  ];

  const retentionData = [
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
            {Math.round((activeStudents / totalStudents) * 100)}% engagement rate
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
            <BarChart data={retentionData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="department" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="retention" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
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
