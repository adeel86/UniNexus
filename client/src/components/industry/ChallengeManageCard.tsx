import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Award, Trash2, CheckCircle2, Users, FileText } from "lucide-react";
import type { Challenge } from "@shared/schema";

interface ChallengeManageCardProps {
  challenge: Challenge;
  onManageRankings: (challenge: Challenge) => void;
  onDelete: (challengeId: string) => void;
  isDeleting: boolean;
}

export function ChallengeManageCard({ challenge, onManageRankings, onDelete, isDeleting }: ChallengeManageCardProps) {
  const statusColor = challenge.status === 'active'
    ? 'bg-green-600'
    : challenge.status === 'upcoming'
    ? 'bg-blue-600'
    : 'bg-gray-500';

  return (
    <Card className="p-5" data-testid={`challenge-manage-${challenge.id}`}>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <h3 className="font-semibold text-lg truncate">{challenge.title}</h3>
            <Badge className={`${statusColor} text-white text-xs`}>
              {challenge.status}
            </Badge>
            {(challenge as any).resultsPublished ? (
              <Badge className="bg-green-600 text-white text-xs">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Results Published
              </Badge>
            ) : null}
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{challenge.description}</p>
          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {challenge.participantCount || 0} participants
            </span>
            {challenge.endDate && (
              <span className="flex items-center gap-1">
                Deadline: {new Date(challenge.endDate).toLocaleDateString()}
              </span>
            )}
            {challenge.maxParticipants ? (
              <span>Max: {challenge.maxParticipants}</span>
            ) : null}
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button
            variant="outline"
            onClick={() => onManageRankings(challenge)}
            data-testid={`button-manage-rankings-${challenge.id}`}
          >
            <Award className="h-4 w-4 mr-2" />
            Review & Rank
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => onDelete(challenge.id)}
            disabled={isDeleting}
            data-testid={`button-delete-challenge-${challenge.id}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
