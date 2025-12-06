import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Award } from "lucide-react";
import type { Challenge } from "@shared/schema";

interface ChallengeManageCardProps {
  challenge: Challenge;
  onManageRankings: (challenge: Challenge) => void;
}

export function ChallengeManageCard({ challenge, onManageRankings }: ChallengeManageCardProps) {
  return (
    <Card className="p-5" data-testid={`challenge-manage-${challenge.id}`}>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <h3 className="font-semibold text-lg">{challenge.title}</h3>
            <Badge variant={challenge.status === 'active' ? 'default' : 'secondary'}>
              {challenge.status}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {challenge.participantCount || 0} participants
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2">{challenge.description}</p>
          {challenge.endDate && (
            <p className="text-xs text-muted-foreground mt-2">
              Ends: {new Date(challenge.endDate).toLocaleDateString()}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => onManageRankings(challenge)}
            data-testid={`button-manage-rankings-${challenge.id}`}
          >
            <Award className="h-4 w-4 mr-2" />
            Award Rankings
          </Button>
        </div>
      </div>
    </Card>
  );
}
