import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Trophy, Medal, ExternalLink } from "lucide-react";
import { UserAvatar } from "@/components/UserAvatar";
import type { Challenge } from "@shared/schema";
import { getRankLabel, type Participant } from "./useIndustryDashboard";

interface RankingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  challenge: Challenge | null;
  participants: Participant[];
  onAwardRank: (participantId: string, rank: number) => void;
  isPending: boolean;
}

export function RankingModal({
  open,
  onOpenChange,
  challenge,
  participants,
  onAwardRank,
  isPending,
}: RankingModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Award Rankings - {challenge?.title}
          </DialogTitle>
          <DialogDescription>
            Assign rankings to participants. Points will be automatically awarded:
            1st Place: +500 pts, 2nd Place: +300 pts, 3rd Place: +200 pts
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {participants.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Medal className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No submissions yet for this challenge.</p>
            </div>
          ) : (
            participants.map((participant) => (
              <Card key={participant.id} className="p-4" data-testid={`participant-${participant.id}`}>
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    {participant.user && <UserAvatar user={participant.user} size="md" />}
                    <div>
                      <p className="font-medium">
                        {participant.user?.firstName} {participant.user?.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Submitted: {new Date(participant.submittedAt).toLocaleDateString()}
                      </p>
                      {participant.submissionUrl && (
                        <a
                          href={participant.submissionUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-1"
                        >
                          <ExternalLink className="h-3 w-3" />
                          View Submission
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {participant.rank ? (
                      <Badge className={`${getRankLabel(participant.rank).color} text-white`}>
                        {getRankLabel(participant.rank).label} {getRankLabel(participant.rank).points}
                      </Badge>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          onClick={() => onAwardRank(participant.id, 1)}
                          disabled={isPending}
                          className="bg-yellow-500 hover:bg-yellow-600"
                          data-testid={`button-award-1st-${participant.id}`}
                        >
                          <Medal className="h-4 w-4 mr-1" />
                          1st
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => onAwardRank(participant.id, 2)}
                          disabled={isPending}
                          className="bg-gray-400 hover:bg-gray-500"
                          data-testid={`button-award-2nd-${participant.id}`}
                        >
                          <Medal className="h-4 w-4 mr-1" />
                          2nd
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => onAwardRank(participant.id, 3)}
                          disabled={isPending}
                          className="bg-orange-600 hover:bg-orange-700"
                          data-testid={`button-award-3rd-${participant.id}`}
                        >
                          <Medal className="h-4 w-4 mr-1" />
                          3rd
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
