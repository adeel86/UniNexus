import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";
import { getCategoryLabel, getContextLabel, type FeedbackWithStudent } from "./useIndustryDashboard";

interface FeedbackCardProps {
  feedback: FeedbackWithStudent;
}

export function FeedbackCard({ feedback }: FeedbackCardProps) {
  return (
    <Card className="p-4" data-testid={`feedback-${feedback.id}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-semibold">
              {feedback.student?.firstName} {feedback.student?.lastName}
            </span>
            <Badge variant="secondary" className="text-xs">
              {getCategoryLabel(feedback.category)}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {getContextLabel(feedback.context)}
            </Badge>
          </div>
          <div className="flex items-center gap-1 mb-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`h-4 w-4 ${
                  star <= feedback.rating
                    ? "fill-yellow-500 text-yellow-500"
                    : "text-muted-foreground"
                }`}
              />
            ))}
            <span className="text-sm text-muted-foreground ml-1">
              {feedback.rating}/5
            </span>
          </div>
          <p className="text-sm">{feedback.feedback}</p>
          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
            {feedback.student?.university && <span>{feedback.student.university}</span>}
            {feedback.student?.major && <span>{feedback.student.major}</span>}
            {feedback.createdAt && (
              <span>
                {new Date(feedback.createdAt).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
