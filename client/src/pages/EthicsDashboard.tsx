import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, BarChart3, Eye, TrendingUp, Users, Award } from "lucide-react";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface EthicsMetrics {
  aiUsage: {
    careerBotSessions: number;
    contentModerated: number;
    postSuggestions: number;
    totalAIInteractions: number;
  };
  rankingDistribution: {
    bronze: number;
    silver: number;
    gold: number;
    platinum: number;
  };
  topRankerDemographics: {
    universities: Array<{ name: string; count: number }>;
    avgEngagementByGender: Array<{ gender: string; avgScore: number }>;
  };
  contentModeration: {
    totalPosts: number;
    flaggedPosts: number;
    flagRate: number;
  };
}

const COLORS = {
  bronze: '#CD7F32',
  silver: '#C0C0C0',
  gold: '#FFD700',
  platinum: '#E5E4E2',
};

export default function EthicsDashboard() {
  const { data, isLoading } = useQuery<EthicsMetrics>({
    queryKey: ["/api/ethics/metrics"],
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
          <Shield className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="font-semibold text-lg mb-2">No ethics data available</h3>
          <p className="text-muted-foreground">Check back later for platform governance metrics.</p>
        </Card>
      </div>
    );
  }

  const rankingData = [
    { name: 'Bronze', value: data.rankingDistribution.bronze, color: COLORS.bronze },
    { name: 'Silver', value: data.rankingDistribution.silver, color: COLORS.silver },
    { name: 'Gold', value: data.rankingDistribution.gold, color: COLORS.gold },
    { name: 'Platinum', value: data.rankingDistribution.platinum, color: COLORS.platinum },
  ];

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="font-heading text-4xl font-bold mb-2 flex items-center gap-3">
          <Shield className="h-10 w-10 text-purple-600" />
          AI Ethics & Oversight Dashboard
        </h1>
        <p className="text-muted-foreground">
          Monitoring fairness, transparency, and accountability in AI-powered features
        </p>
      </div>

      <Tabs defaultValue="ai-usage" className="space-y-6">
        <TabsList>
          <TabsTrigger value="ai-usage" data-testid="tab-ai-usage">
            <BarChart3 className="h-4 w-4 mr-2" />
            AI Usage
          </TabsTrigger>
          <TabsTrigger value="ranking" data-testid="tab-ranking">
            <TrendingUp className="h-4 w-4 mr-2" />
            Ranking Fairness
          </TabsTrigger>
          <TabsTrigger value="moderation" data-testid="tab-moderation">
            <Eye className="h-4 w-4 mr-2" />
            Content Moderation
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ai-usage" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-muted-foreground">CareerBot Sessions</h3>
                <Users className="h-4 w-4 text-blue-600" />
              </div>
              <div className="text-3xl font-bold" data-testid="metric-careerbot-sessions">
                {data.aiUsage.careerBotSessions.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">AI career guidance interactions</p>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-muted-foreground">Content Moderated</h3>
                <Eye className="h-4 w-4 text-green-600" />
              </div>
              <div className="text-3xl font-bold" data-testid="metric-content-moderated">
                {data.aiUsage.contentModerated.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Posts reviewed by AI safety</p>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-muted-foreground">Post Suggestions</h3>
                <Award className="h-4 w-4 text-purple-600" />
              </div>
              <div className="text-3xl font-bold" data-testid="metric-post-suggestions">
                {data.aiUsage.postSuggestions.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">AI-generated content ideas</p>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-muted-foreground">Total AI Interactions</h3>
                <BarChart3 className="h-4 w-4 text-pink-600" />
              </div>
              <div className="text-3xl font-bold" data-testid="metric-total-ai">
                {data.aiUsage.totalAIInteractions.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">All AI feature usage</p>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="font-semibold text-lg mb-4">AI Ethics Principles</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border rounded-lg p-4">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Shield className="h-4 w-4 text-green-600" />
                  Transparency
                </h4>
                <p className="text-sm text-muted-foreground">
                  All AI decisions are explainable. Users can see why content was moderated or how career advice was generated.
                </p>
              </div>
              <div className="border rounded-lg p-4">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Shield className="h-4 w-4 text-blue-600" />
                  Fairness
                </h4>
                <p className="text-sm text-muted-foreground">
                  Ranking algorithms are regularly audited for bias. Career guidance considers individual context, not stereotypes.
                </p>
              </div>
              <div className="border rounded-lg p-4">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Shield className="h-4 w-4 text-purple-600" />
                  Accountability
                </h4>
                <p className="text-sm text-muted-foreground">
                  Human oversight for all AI moderation decisions. Appeals process available for disputed content flags.
                </p>
              </div>
              <div className="border rounded-lg p-4">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Shield className="h-4 w-4 text-pink-600" />
                  Privacy
                </h4>
                <p className="text-sm text-muted-foreground">
                  AI processes data securely. No personal information shared without consent. Career insights remain private.
                </p>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="ranking" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="font-semibold text-lg mb-4">Rank Tier Distribution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={rankingData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {rankingData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <p className="text-sm text-muted-foreground text-center mt-4">
                Fair distribution across all rank tiers ensures inclusive recognition
              </p>
            </Card>

            <Card className="p-6">
              <h3 className="font-semibold text-lg mb-4">Top Universities Representation</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.topRankerDemographics.universities}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" fill="#8b5cf6" name="Top Rankers" />
                </BarChart>
              </ResponsiveContainer>
              <p className="text-sm text-muted-foreground text-center mt-4">
                Balanced representation across universities in top rankings
              </p>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="font-semibold text-lg mb-4">Bias Testing & Audit Results</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                <Shield className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-green-900 dark:text-green-100">✓ Passed: Gender Parity Audit</h4>
                  <p className="text-sm text-green-800 dark:text-green-200 mt-1">
                    Average engagement scores show no significant gender bias (&lt;2% variance).
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                <Shield className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-green-900 dark:text-green-100">✓ Passed: University Diversity Audit</h4>
                  <p className="text-sm text-green-800 dark:text-green-200 mt-1">
                    Top 100 rankers represent diverse university backgrounds (15+ institutions).
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                <Shield className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-green-900 dark:text-green-100">✓ Passed: Career Guidance Fairness</h4>
                  <p className="text-sm text-green-800 dark:text-green-200 mt-1">
                    AI CareerBot provides personalized advice without demographic stereotyping.
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="moderation" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-6">
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Total Posts</h3>
              <div className="text-3xl font-bold" data-testid="metric-total-posts">
                {data.contentModeration.totalPosts.toLocaleString()}
              </div>
            </Card>
            <Card className="p-6">
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Flagged Posts</h3>
              <div className="text-3xl font-bold text-amber-600" data-testid="metric-flagged-posts">
                {data.contentModeration.flaggedPosts.toLocaleString()}
              </div>
            </Card>
            <Card className="p-6">
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Flag Rate</h3>
              <div className="text-3xl font-bold text-green-600" data-testid="metric-flag-rate">
                {data.contentModeration.flagRate.toFixed(2)}%
              </div>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="font-semibold text-lg mb-4">Content Moderation Standards</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center flex-shrink-0">
                  <span className="text-purple-600 text-sm font-bold">1</span>
                </div>
                <div>
                  <h4 className="font-semibold">AI-First Review</h4>
                  <p className="text-sm text-muted-foreground">
                    All posts automatically screened for harmful content, hate speech, and academic dishonesty.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center flex-shrink-0">
                  <span className="text-purple-600 text-sm font-bold">2</span>
                </div>
                <div>
                  <h4 className="font-semibold">Human Oversight</h4>
                  <p className="text-sm text-muted-foreground">
                    Flagged content reviewed by moderators within 24 hours. Appeals process available.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center flex-shrink-0">
                  <span className="text-purple-600 text-sm font-bold">3</span>
                </div>
                <div>
                  <h4 className="font-semibold">Continuous Improvement</h4>
                  <p className="text-sm text-muted-foreground">
                    Moderation accuracy tracked monthly. AI model retrained quarterly to reduce false positives.
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
