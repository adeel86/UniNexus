import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { FileText, Users, Trophy, Award, TrendingUp, Globe } from "lucide-react";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface TransparencyMetrics {
  participation: {
    totalUsers: number;
    activeUsers: number;
    universitiesRepresented: number;
    challengeParticipation: number;
  };
  recognition: {
    totalBadges: number;
    totalEndorsements: number;
    totalCertifications: number;
    winnersByUniversity: Array<{ university: string; count: number }>;
  };
  challengeFairness: {
    participationByCategory: Array<{ category: string; count: number }>;
    winRateByTier: Array<{ tier: string; winRate: number }>;
  };
  diversity: {
    universitiesInTop100: number;
    avgPointsByUniversity: Array<{ university: string; avgPoints: number }>;
  };
}

const CATEGORY_COLORS = ['#8b5cf6', '#ec4899', '#3b82f6', '#10b981', '#f59e0b'];

export default function TransparencyReport() {
  const { data, isLoading } = useQuery<TransparencyMetrics>({
    queryKey: ["/api/transparency/metrics"],
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="animate-pulse space-y-6">
          <div className="h-12 bg-muted rounded w-1/3"></div>
          <div className="h-96 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <Card className="p-12 text-center">
          <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="font-semibold text-lg mb-2">No transparency data available</h3>
          <p className="text-muted-foreground">Check back later for platform transparency metrics.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="font-heading text-4xl font-bold mb-2 flex items-center gap-3">
          <FileText className="h-10 w-10 text-purple-600" />
          Public Transparency Report
        </h1>
        <p className="text-muted-foreground">
          Demonstrating fairness, diversity, and representation across UniNexus
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          Last updated: {new Date().toLocaleDateString()} | Publicly accessible
        </p>
      </div>

      <div className="space-y-6">
        {/* Platform Overview */}
        <Card className="p-6">
          <h2 className="font-semibold text-xl mb-4 flex items-center gap-2">
            <Globe className="h-6 w-6 text-purple-600" />
            Platform Overview
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-muted-foreground">Total Users</h3>
                <Users className="h-4 w-4 text-blue-600" />
              </div>
              <div className="text-3xl font-bold" data-testid="metric-total-users">
                {data.participation.totalUsers.toLocaleString()}
              </div>
            </div>
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-muted-foreground">Active Users</h3>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </div>
              <div className="text-3xl font-bold" data-testid="metric-active-users">
                {data.participation.activeUsers.toLocaleString()}
              </div>
            </div>
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-muted-foreground">Universities</h3>
                <Globe className="h-4 w-4 text-purple-600" />
              </div>
              <div className="text-3xl font-bold" data-testid="metric-universities">
                {data.participation.universitiesRepresented}
              </div>
            </div>
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-muted-foreground">Challenge Participants</h3>
                <Trophy className="h-4 w-4 text-amber-600" />
              </div>
              <div className="text-3xl font-bold" data-testid="metric-challenge-participants">
                {data.participation.challengeParticipation.toLocaleString()}
              </div>
            </div>
          </div>
        </Card>

        {/* Recognition Distribution */}
        <Card className="p-6">
          <h2 className="font-semibold text-xl mb-4 flex items-center gap-2">
            <Award className="h-6 w-6 text-purple-600" />
            Recognition & Achievements
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="border rounded-lg p-4 text-center">
              <div className="text-4xl font-bold text-purple-600" data-testid="metric-total-badges">
                {data.recognition.totalBadges.toLocaleString()}
              </div>
              <p className="text-sm text-muted-foreground mt-2">Total Badges Awarded</p>
            </div>
            <div className="border rounded-lg p-4 text-center">
              <div className="text-4xl font-bold text-blue-600" data-testid="metric-total-endorsements">
                {data.recognition.totalEndorsements.toLocaleString()}
              </div>
              <p className="text-sm text-muted-foreground mt-2">Peer Endorsements</p>
            </div>
            <div className="border rounded-lg p-4 text-center">
              <div className="text-4xl font-bold text-green-600" data-testid="metric-total-certifications">
                {data.recognition.totalCertifications.toLocaleString()}
              </div>
              <p className="text-sm text-muted-foreground mt-2">Digital Certifications Issued</p>
            </div>
          </div>

          <h3 className="font-semibold mb-3">Challenge Winners by University</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.recognition.winnersByUniversity}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="university" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#8b5cf6" name="Winners" />
            </BarChart>
          </ResponsiveContainer>
          <p className="text-sm text-muted-foreground text-center mt-4">
            Fair distribution of winners across all participating universities
          </p>
        </Card>

        {/* Challenge Participation Fairness */}
        <Card className="p-6">
          <h2 className="font-semibold text-xl mb-4 flex items-center gap-2">
            <Trophy className="h-6 w-6 text-purple-600" />
            Challenge Participation & Fairness
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-3">Participation by Category</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={data.challengeFairness.participationByCategory}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ category, percent }) => `${category}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {data.challengeFairness.participationByCategory.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div>
              <h3 className="font-semibold mb-3">Win Rate by Rank Tier</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.challengeFairness.winRateByTier}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="tier" />
                  <YAxis label={{ value: 'Win Rate (%)', angle: -90, position: 'insideLeft' }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="winRate" fill="#ec4899" name="Win Rate %" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <p className="text-sm text-muted-foreground text-center mt-4">
            Challenge participation is accessible and fair across all categories and skill levels
          </p>
        </Card>

        {/* Diversity & Inclusion */}
        <Card className="p-6">
          <h2 className="font-semibold text-xl mb-4 flex items-center gap-2">
            <Users className="h-6 w-6 text-purple-600" />
            Diversity & Representation
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="border rounded-lg p-6 text-center">
              <div className="text-5xl font-bold text-purple-600 mb-2" data-testid="metric-universities-top100">
                {data.diversity.universitiesInTop100}
              </div>
              <p className="text-sm text-muted-foreground">
                Universities Represented in Top 100 Rankers
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Demonstrates inclusive leaderboard and fair ranking across institutions
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-3">Average Points by University (Top 10)</h3>
              <div className="space-y-2">
                {data.diversity.avgPointsByUniversity.slice(0, 10).map((item: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                    <span className="text-sm font-medium truncate flex-1">{item.university}</span>
                    <span className="text-sm font-bold text-purple-600 ml-2">{Math.round(item.avgPoints)} pts</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* Commitment Statement */}
        <Card className="p-6 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950">
          <h2 className="font-semibold text-xl mb-4">Our Commitment to Fairness & Transparency</h2>
          <div className="space-y-3 text-sm">
            <p>
              <strong>Equal Opportunity:</strong> UniNexus is committed to providing equal opportunities for recognition, learning, and growth to all students regardless of their background, university, or demographic.
            </p>
            <p>
              <strong>Regular Audits:</strong> We conduct quarterly audits of our ranking algorithms and AI systems to identify and eliminate bias. Results are publicly shared in this transparency report.
            </p>
            <p>
              <strong>Open Data:</strong> Aggregate platform metrics are publicly accessible to ensure accountability and build trust with our community.
            </p>
            <p>
              <strong>Continuous Improvement:</strong> We actively seek feedback from students, educators, and partners to improve fairness and representation on our platform.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
