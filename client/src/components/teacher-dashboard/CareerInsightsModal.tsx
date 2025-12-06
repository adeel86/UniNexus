import type { User } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface CareerInsightsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: User | null;
  insights: {
    summary: string;
    student: { id: string; firstName: string; lastName: string; major?: string; university?: string; rankTier: string };
  } | undefined;
  isLoading: boolean;
}

export function CareerInsightsModal({
  open,
  onOpenChange,
  student,
  insights,
  isLoading,
}: CareerInsightsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl">
            <Sparkles className="inline-block mr-2 h-6 w-6" />
            AI Career Insights for {student?.firstName} {student?.lastName}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="pr-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <span className="ml-3 text-muted-foreground">Generating AI insights...</span>
              </div>
            ) : insights ? (
              <div className="space-y-4">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <div className="whitespace-pre-wrap">{insights.summary}</div>
                </div>
                {insights.student && (
                  <div className="flex gap-2 pt-4 border-t text-sm text-muted-foreground">
                    <span>Rank: {insights.student.rankTier}</span>
                    {insights.student.major && <span>Major: {insights.student.major}</span>}
                    {insights.student.university && <span>University: {insights.student.university}</span>}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No insights available
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="flex justify-end pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid="button-close-career-insights"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
