import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Star, TrendingUp, AlertCircle, ClipboardList } from "lucide-react";

interface FeedbackInsights {
  totalFeedback: number;
  avgRating: number;
  categoryInsights: {
    category: string;
    count: number;
    avgRating: number;
    recentFeedback: {
      rating: number;
      feedback: string;
      context: string | null;
      createdAt: string | null;
    }[];
  }[];
  strengths: string[];
  improvementAreas: string[];
}

interface RecruiterFeedbackSectionProps {
  userId: string;
  isOwnProfile?: boolean;
}

export function RecruiterFeedbackSection({ userId, isOwnProfile = true }: RecruiterFeedbackSectionProps) {
  const { data: insights, isLoading } = useQuery<FeedbackInsights>({
    queryKey: ["/api/recruiter-feedback/insights", userId],
    queryFn: async () => {
      const response = await fetch(`/api/recruiter-feedback/insights/${userId}`);
      if (!response.ok) {
        if (response.status === 404) {
          return { totalFeedback: 0, avgRating: 0, categoryInsights: [], strengths: [], improvementAreas: [] };
        }
        throw new Error('Failed to fetch feedback insights');
      }
      return response.json();
    },
    enabled: !!userId,
  });

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      technical_skills: "Technical Skills",
      soft_skills: "Soft Skills",
      problem_solving: "Problem Solving",
      communication: "Communication",
      leadership: "Leadership",
      teamwork: "Teamwork",
    };
    return labels[category] || category;
  };

  if (isLoading) {
    return (
      <Card className="p-6 mt-6">
        <h2 className="font-heading text-xl font-semibold mb-4 flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-green-600" />
          Industry Feedback
        </h2>
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </div>
      </Card>
    );
  }

  if (!insights || insights.totalFeedback === 0) {
    return (
      <Card className="p-6 mt-6">
        <h2 className="font-heading text-xl font-semibold mb-4 flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-green-600" />
          Industry Feedback
        </h2>
        <div className="text-center py-8 text-muted-foreground">
          <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No industry feedback yet</p>
          <p className="text-sm mt-1">
            {isOwnProfile
              ? "Participate in challenges and engage with recruiters to receive feedback"
              : "This student hasn't received industry feedback yet"}
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 mt-6" data-testid="recruiter-feedback-section">
      <h2 className="font-heading text-xl font-semibold mb-4 flex items-center gap-2">
        <ClipboardList className="h-5 w-5 text-green-600" />
        Industry Feedback ({insights.totalFeedback})
      </h2>

      {/* Overall Rating */}
      <div className="flex items-center gap-4 mb-6 p-4 rounded-lg bg-muted/50">
        <div className="text-center">
          <div className="text-3xl font-bold">{insights.avgRating}</div>
          <div className="flex items-center gap-0.5 mt-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`h-4 w-4 ${
                  star <= Math.round(insights.avgRating)
                    ? "fill-yellow-500 text-yellow-500"
                    : "text-muted-foreground"
                }`}
              />
            ))}
          </div>
          <div className="text-xs text-muted-foreground mt-1">Overall Rating</div>
        </div>
        <div className="flex-1 border-l pl-4">
          <div className="text-sm text-muted-foreground mb-1">
            Based on {insights.totalFeedback} review{insights.totalFeedback > 1 ? "s" : ""} from industry professionals
          </div>
          <div className="flex flex-wrap gap-2">
            {insights.strengths.length > 0 && (
              <div className="flex items-center gap-1">
                <TrendingUp className="h-3.5 w-3.5 text-green-600" />
                <span className="text-xs">Strengths: {insights.strengths.map(getCategoryLabel).join(", ")}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Category Breakdown */}
      {insights.categoryInsights.length > 0 && (
        <div className="space-y-4 mb-6">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Skill Breakdown
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {insights.categoryInsights.map((cat) => (
              <div key={cat.category} className="p-3 rounded-lg border">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm">{getCategoryLabel(cat.category)}</span>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-3 w-3 ${
                          star <= Math.round(cat.avgRating)
                            ? "fill-yellow-500 text-yellow-500"
                            : "text-muted-foreground"
                        }`}
                      />
                    ))}
                    <span className="text-xs text-muted-foreground ml-1">
                      ({cat.count})
                    </span>
                  </div>
                </div>
                <Progress value={(cat.avgRating / 5) * 100} className="h-2" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Improvement Areas */}
      {insights.improvementAreas.length > 0 && (
        <div className="p-4 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-sm">Areas for Growth</h4>
              <div className="flex flex-wrap gap-1 mt-2">
                {insights.improvementAreas.map((area) => (
                  <Badge key={area} variant="outline" className="text-xs">
                    {getCategoryLabel(area)}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Feedback Snippets */}
      {insights.categoryInsights.some((c) => c.recentFeedback.length > 0) && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Recent Feedback
          </h3>
          <div className="space-y-3">
            {insights.categoryInsights
              .flatMap((c) =>
                c.recentFeedback.map((fb) => ({
                  ...fb,
                  category: c.category,
                }))
              )
              .slice(0, 3)
              .map((fb, idx) => (
                <div key={idx} className="p-3 rounded-lg border">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary" className="text-xs">
                      {getCategoryLabel(fb.category)}
                    </Badge>
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-3 w-3 ${
                            star <= fb.rating
                              ? "fill-yellow-500 text-yellow-500"
                              : "text-muted-foreground"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-sm">{fb.feedback}</p>
                </div>
              ))}
          </div>
        </div>
      )}
    </Card>
  );
}
