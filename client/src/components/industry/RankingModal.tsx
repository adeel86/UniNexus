import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Trophy, Medal, ExternalLink, Users, FileText, CheckCircle2, Send } from "lucide-react";
import { UserAvatar } from "@/components/UserAvatar";
import type { Challenge } from "@shared/schema";
import { getRankLabel, type Participant } from "./useIndustryDashboard";

interface RankingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  challenge: Challenge | null;
  participants: Participant[];
  allParticipants: Participant[];
  onAwardRank: (participantId: string, rank: number) => void;
  onEvaluate: (participantId: string, score?: number, feedback?: string) => void;
  onPublishResults: (challengeId: string) => void;
  isPending: boolean;
  isPublishing: boolean;
}

export function RankingModal({
  open,
  onOpenChange,
  challenge,
  participants,
  allParticipants,
  onAwardRank,
  onEvaluate,
  onPublishResults,
  isPending,
  isPublishing,
}: RankingModalProps) {
  const [localScores, setLocalScores] = useState<Record<string, string>>({});
  const [localFeedbacks, setLocalFeedbacks] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<"submissions" | "joined">("submissions");

  const joinedOnly = allParticipants.filter(p => !p.submittedAt);
  const submitted = participants;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Manage Challenge — {challenge?.title}
          </DialogTitle>
          <DialogDescription>
            Review submissions, assign scores, award rankings, and publish results to participants.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1">
          <div className="flex gap-2 text-sm text-muted-foreground mb-4">
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {allParticipants.length} joined
            </span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <FileText className="h-4 w-4" />
              {submitted.length} submitted
            </span>
            {challenge?.resultsPublished ? (
              <Badge className="ml-auto bg-green-600">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Results Published
              </Badge>
            ) : null}
          </div>

          <div className="flex gap-2 border-b mb-4">
            <button
              className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${activeTab === "submissions" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
              onClick={() => setActiveTab("submissions")}
            >
              Submissions ({submitted.length})
            </button>
            <button
              className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${activeTab === "joined" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
              onClick={() => setActiveTab("joined")}
            >
              Joined (No Submission) ({joinedOnly.length})
            </button>
          </div>
        </div>

        {activeTab === "submissions" && (
          <div className="space-y-4 py-2">
            {submitted.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Medal className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No submissions yet for this challenge.</p>
              </div>
            ) : (
              submitted.map((participant) => (
                <Card key={participant.id} className="p-4" data-testid={`participant-${participant.id}`}>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-3">
                        {participant.user && <UserAvatar user={participant.user} size="md" />}
                        <div>
                          <p className="font-medium">
                            {participant.user?.firstName} {participant.user?.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Submitted: {participant.submittedAt ? new Date(participant.submittedAt).toLocaleDateString() : "—"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {participant.rank ? (
                          <Badge className={`${getRankLabel(participant.rank).color} text-white`}>
                            {getRankLabel(participant.rank).label}
                          </Badge>
                        ) : null}
                        {participant.score !== null && participant.score !== undefined ? (
                          <Badge variant="outline">Score: {participant.score}/100</Badge>
                        ) : null}
                      </div>
                    </div>

                    {participant.submissionUrl && (
                      <a
                        href={participant.submissionUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                        data-testid={`link-submission-${participant.id}`}
                      >
                        <ExternalLink className="h-3 w-3" />
                        View Submission Link
                      </a>
                    )}

                    {participant.submissionDescription && (
                      <div className="text-xs text-muted-foreground bg-muted rounded p-2">
                        <p className="font-medium text-foreground mb-1">Description:</p>
                        <p>{participant.submissionDescription}</p>
                      </div>
                    )}

                    {participant.feedback && (
                      <div className="text-xs bg-blue-50 dark:bg-blue-950 text-blue-800 dark:text-blue-200 rounded p-2">
                        <p className="font-medium mb-1">Your Feedback:</p>
                        <p>{participant.feedback}</p>
                      </div>
                    )}

                    <div className="border-t pt-3 space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Award Rank</Label>
                          <div className="flex gap-1 mt-1">
                            {[1, 2, 3].map((rank) => (
                              <Button
                                key={rank}
                                size="sm"
                                variant={participant.rank === rank ? "default" : "outline"}
                                onClick={() => onAwardRank(participant.id, rank)}
                                disabled={isPending}
                                className={`text-xs ${rank === 1 ? "bg-yellow-500 hover:bg-yellow-600 border-yellow-500" : rank === 2 ? "bg-gray-400 hover:bg-gray-500 border-gray-400" : "bg-orange-600 hover:bg-orange-700 border-orange-600"} ${participant.rank === rank ? "text-white" : "text-foreground"}`}
                                data-testid={`button-award-rank-${rank}-${participant.id}`}
                              >
                                #{rank}
                              </Button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <Label htmlFor={`score-${participant.id}`} className="text-xs">Score (0–100)</Label>
                          <div className="flex gap-2 mt-1">
                            <Input
                              id={`score-${participant.id}`}
                              type="number"
                              min="0"
                              max="100"
                              placeholder="e.g. 85"
                              value={localScores[participant.id] ?? (participant.score !== null && participant.score !== undefined ? String(participant.score) : "")}
                              onChange={(e) => setLocalScores(prev => ({ ...prev, [participant.id]: e.target.value }))}
                              className="h-8 text-sm"
                              data-testid={`input-score-${participant.id}`}
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 shrink-0"
                              disabled={isPending || !localScores[participant.id]}
                              onClick={() => onEvaluate(participant.id, Number(localScores[participant.id]), undefined)}
                              data-testid={`button-save-score-${participant.id}`}
                            >
                              Save
                            </Button>
                          </div>
                        </div>
                      </div>

                      <div>
                        <Label htmlFor={`feedback-${participant.id}`} className="text-xs">Feedback to Participant</Label>
                        <div className="flex gap-2 mt-1">
                          <Textarea
                            id={`feedback-${participant.id}`}
                            placeholder="Write constructive feedback for this participant..."
                            value={localFeedbacks[participant.id] ?? (participant.feedback || "")}
                            onChange={(e) => setLocalFeedbacks(prev => ({ ...prev, [participant.id]: e.target.value }))}
                            className="min-h-[60px] text-sm resize-none"
                            data-testid={`input-feedback-${participant.id}`}
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-auto shrink-0"
                            disabled={isPending || !localFeedbacks[participant.id]}
                            onClick={() => onEvaluate(participant.id, undefined, localFeedbacks[participant.id])}
                            data-testid={`button-save-feedback-${participant.id}`}
                          >
                            <Send className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

        {activeTab === "joined" && (
          <div className="space-y-3 py-2">
            {joinedOnly.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Everyone who joined has submitted.</p>
              </div>
            ) : (
              joinedOnly.map((participant) => (
                <Card key={participant.id} className="p-3" data-testid={`joined-participant-${participant.id}`}>
                  <div className="flex items-center gap-3">
                    {participant.user && <UserAvatar user={participant.user} size="sm" />}
                    <div>
                      <p className="font-medium text-sm">
                        {participant.user?.firstName} {participant.user?.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Joined: {participant.joinedAt ? new Date(participant.joinedAt).toLocaleDateString() : "—"} · No submission yet
                      </p>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {challenge && !challenge.resultsPublished && (
            <Button
              onClick={() => onPublishResults(challenge.id)}
              disabled={isPublishing || submitted.length === 0}
              className="bg-green-600 hover:bg-green-700"
              data-testid="button-publish-results"
            >
              {isPublishing ? "Publishing..." : "Publish Results"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
