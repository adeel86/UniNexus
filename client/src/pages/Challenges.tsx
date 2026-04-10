import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Trophy, Calendar, Users, Target, Sparkles, CheckCircle, Clock,
  Award, Medal, Star, Edit2, ExternalLink,
} from "lucide-react";
import { format } from "date-fns";
import { MobilePageHeader } from "@/components/MobilePageHeader";

interface Challenge {
  id: string;
  title: string;
  description: string;
  requirements: string | null;
  evaluationCriteria: string | null;
  organizerId: string | null;
  category: string | null;
  difficulty: string;
  prizes: string | null;
  startDate: string | null;
  endDate: string | null;
  participantCount: number;
  status: string;
  resultsPublished: number;
  createdAt: string;
  organizer: {
    id: string;
    displayName: string;
    company: string | null;
  } | null;
}

interface Participation {
  id: string;
  challengeId: string;
  userId: string;
  submissionUrl: string | null;
  submissionDescription: string | null;
  submittedAt: string | null;
  rank: number | null;
  score: number | null;
  feedback: string | null;
  joinedAt: string;
  challenge: Challenge;
}

function getRankInfo(rank: number) {
  switch (rank) {
    case 1: return { label: "1st Place", icon: Trophy, color: "bg-yellow-500 text-white" };
    case 2: return { label: "2nd Place", icon: Medal, color: "bg-gray-400 text-white" };
    case 3: return { label: "3rd Place", icon: Award, color: "bg-orange-600 text-white" };
    default: return { label: `#${rank}`, icon: Star, color: "bg-muted text-foreground" };
  }
}

function isDeadlinePassed(endDate: string | null): boolean {
  if (!endDate) return false;
  return new Date() > new Date(endDate);
}

function getDifficultyColor(difficulty: string) {
  switch (difficulty) {
    case "beginner": return "bg-green-500";
    case "intermediate": return "bg-yellow-500";
    case "advanced": return "bg-red-500";
    default: return "bg-gray-500";
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case "active": return <Badge className="bg-green-600">Active</Badge>;
    case "upcoming": return <Badge className="bg-blue-600">Upcoming</Badge>;
    case "completed": return <Badge className="bg-gray-600">Completed</Badge>;
    default: return null;
  }
}

export default function Challenges() {
  const { userData } = useAuth();
  const { toast } = useToast();

  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [dialogChallenge, setDialogChallenge] = useState<Challenge | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [submissionUrl, setSubmissionUrl] = useState("");
  const [submissionDescription, setSubmissionDescription] = useState("");

  const { data: challenges = [], isLoading: loadingChallenges } = useQuery<Challenge[]>({
    queryKey: ["/api/challenges"],
  });

  const { data: myParticipations = [], isLoading: loadingParticipations } = useQuery<Participation[]>({
    queryKey: ["/api/challenges/my-participations"],
  });

  const joinMutation = useMutation({
    mutationFn: async (challengeId: string) => {
      const response = await apiRequest("POST", `/api/challenges/${challengeId}/join`, {});
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/challenges"] });
      queryClient.invalidateQueries({ queryKey: ["/api/challenges/my-participations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      toast({
        title: "Challenge Joined! +5 Challenge Points",
        description: "You've joined the challenge! Submit your solution to earn +25 more.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to join",
        description: error.message || "You may have already joined this challenge.",
        variant: "destructive",
      });
    },
  });

  const submitMutation = useMutation({
    mutationFn: async ({
      challengeId,
      url,
      description,
    }: {
      challengeId: string;
      url: string;
      description: string;
    }) => {
      const response = await apiRequest("POST", `/api/challenges/${challengeId}/submit`, {
        submissionUrl: url || undefined,
        submissionDescription: description || undefined,
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/challenges/my-participations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      setSubmitDialogOpen(false);
      setDialogChallenge(null);
      setSubmissionUrl("");
      setSubmissionDescription("");
      toast({
        title: isEditMode ? "Submission Updated!" : "Submission Received! +25 Challenge Points",
        description: isEditMode
          ? "Your submission has been updated successfully."
          : "Your solution has been submitted! You've earned +25 Challenge Points.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Submission Failed",
        description: error.message || "Failed to submit your work.",
        variant: "destructive",
      });
    },
  });

  const getParticipation = (challengeId: string) =>
    myParticipations.find(p => p.challengeId === challengeId) ?? null;

  const isParticipating = (challengeId: string) =>
    myParticipations.some(p => p.challengeId === challengeId);

  const openSubmitDialog = (challenge: Challenge, participation?: Participation | null) => {
    const editing = !!participation?.submittedAt;
    setDialogChallenge(challenge);
    setIsEditMode(editing);
    setSubmissionUrl(participation?.submissionUrl ?? "");
    setSubmissionDescription(participation?.submissionDescription ?? "");
    setSubmitDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!dialogChallenge) return;
    submitMutation.mutate({
      challengeId: dialogChallenge.id,
      url: submissionUrl,
      description: submissionDescription,
    });
  };

  const isIndustryOwner = (challenge: Challenge) =>
    userData?.role === "industry_professional" && challenge.organizerId === userData?.id;

  const canJoin = (challenge: Challenge) => {
    if (userData?.role === "university_admin") return false;
    if (isIndustryOwner(challenge)) return false;
    if (challenge.status === "completed") return false;
    return !isParticipating(challenge.id);
  };

  const activeChallenges = challenges.filter(c => c.status === "active");
  const upcomingChallenges = challenges.filter(c => c.status === "upcoming");
  const completedChallenges = challenges.filter(c => c.status === "completed");

  if (loadingChallenges || loadingParticipations) {
    return (
      <div className="container mx-auto p-6">
        <div className="h-64 flex items-center justify-center">
          <div className="text-center">
            <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading challenges...</p>
          </div>
        </div>
      </div>
    );
  }

  const ChallengeActionButtons = ({ challenge }: { challenge: Challenge }) => {
    const participation = getParticipation(challenge.id);
    const submitted = !!participation?.submittedAt;
    const deadlinePassed = isDeadlinePassed(challenge.endDate);
    const canEdit = submitted && !deadlinePassed && challenge.status !== "completed";

    if (canJoin(challenge)) {
      return (
        <Button
          onClick={() => joinMutation.mutate(challenge.id)}
          disabled={joinMutation.isPending}
          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          data-testid={`button-join-${challenge.id}`}
        >
          Join Challenge
        </Button>
      );
    }

    if (isParticipating(challenge.id)) {
      return (
        <div className="flex gap-2">
          {submitted && (
            <Button variant="outline" disabled data-testid={`button-submitted-${challenge.id}`}>
              <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
              Submitted
            </Button>
          )}
          {!submitted && !deadlinePassed && challenge.status === "active" && (
            <Button
              onClick={() => openSubmitDialog(challenge, participation)}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              data-testid={`button-submit-${challenge.id}`}
            >
              Submit Work
            </Button>
          )}
          {canEdit && (
            <Button
              variant="outline"
              onClick={() => openSubmitDialog(challenge, participation)}
              data-testid={`button-edit-submission-${challenge.id}`}
            >
              <Edit2 className="h-4 w-4 mr-2" />
              Edit Submission
            </Button>
          )}
        </div>
      );
    }

    return null;
  };

  const ChallengeCard = ({ challenge, showActions = true }: { challenge: Challenge; showActions?: boolean }) => {
    const deadlinePassed = isDeadlinePassed(challenge.endDate);
    return (
      <Card className="hover-elevate" data-testid={`challenge-card-${challenge.id}`}>
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                {getStatusBadge(challenge.status)}
                <Badge variant="outline" className={`${getDifficultyColor(challenge.difficulty)} text-white`}>
                  {challenge.difficulty}
                </Badge>
                {challenge.category && <Badge variant="secondary">{challenge.category}</Badge>}
              </div>
              <CardTitle className="text-xl sm:text-2xl mb-2">{challenge.title}</CardTitle>
              <CardDescription className="text-sm sm:text-base">{challenge.description}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            {challenge.organizer && (
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">By:</span>
                <span className="font-medium">{challenge.organizer.company || challenge.organizer.displayName}</span>
              </div>
            )}
            {challenge.endDate && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Deadline:</span>
                <span className={`font-medium ${deadlinePassed ? "text-red-500" : ""}`}>
                  {deadlinePassed ? "Closed" : format(new Date(challenge.endDate), "MMM d, yyyy")}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Participants:</span>
              <span className="font-medium">{challenge.participantCount}</span>
            </div>
          </div>

          {challenge.prizes && (
            <div className="p-3 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-md">
              <div className="flex items-start gap-2">
                <Trophy className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm mb-1">Prizes</p>
                  <p className="text-sm text-muted-foreground">{challenge.prizes}</p>
                </div>
              </div>
            </div>
          )}

          {showActions && <ChallengeActionButtons challenge={challenge} />}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="container mx-auto px-3 py-5 sm:px-6 sm:py-6 space-y-6 pt-14 md:pt-5">
      <MobilePageHeader title="Challenges" />
      <div className="text-center space-y-2 mb-6 sm:mb-8">
        <h1 className="font-heading text-2xl sm:text-4xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent">
          Challenges & Hackathons
        </h1>
        <p className="text-muted-foreground text-sm sm:text-lg">
          Join exciting competitions, showcase your skills, and win amazing prizes!
        </p>
      </div>

      <Card className="p-4 mb-6 bg-gradient-to-r from-purple-600/10 via-pink-600/10 to-blue-600/10 border-purple-500/20">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex items-center gap-3">
            <Award className="h-10 w-10 text-primary" />
            <div>
              <h3 className="font-semibold">Earn Challenge Points</h3>
              <p className="text-sm text-muted-foreground">Compete and climb the leaderboard!</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 md:ml-auto text-sm">
            <Badge variant="outline" className="py-1">Join: +5 pts</Badge>
            <Badge variant="outline" className="py-1">Submit: +25 pts</Badge>
            <Badge variant="outline" className="py-1">1st Place: +500 pts</Badge>
            <Badge variant="outline" className="py-1">2nd: +300 pts</Badge>
            <Badge variant="outline" className="py-1">3rd: +200 pts</Badge>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="border-2 border-purple-500/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Challenges</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Target className="h-8 w-8 text-purple-600" />
              <span className="text-3xl font-bold">{activeChallenges.length}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-pink-500/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">My Participations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Trophy className="h-8 w-8 text-pink-600" />
              <span className="text-3xl font-bold">{myParticipations.length}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-blue-500/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Submissions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-8 w-8 text-blue-600" />
              <span className="text-3xl font-bold">
                {myParticipations.filter(p => p.submittedAt).length}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="active" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto">
          <TabsTrigger value="active" className="text-xs sm:text-sm py-2 px-1" data-testid="tab-active-challenges">
            Active ({activeChallenges.length})
          </TabsTrigger>
          <TabsTrigger value="upcoming" className="text-xs sm:text-sm py-2 px-1" data-testid="tab-upcoming-challenges">
            Upcoming ({upcomingChallenges.length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="text-xs sm:text-sm py-2 px-1" data-testid="tab-completed-challenges">
            Completed ({completedChallenges.length})
          </TabsTrigger>
          <TabsTrigger value="my-challenges" className="text-xs sm:text-sm py-2 px-1" data-testid="tab-my-challenges">
            Mine ({myParticipations.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {activeChallenges.length === 0 ? (
            <Card className="p-8 sm:p-12">
              <div className="text-center text-muted-foreground">
                <Sparkles className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 opacity-50" />
                <p className="text-base sm:text-lg">No active challenges at the moment</p>
                <p className="text-sm">Check back soon for new opportunities!</p>
              </div>
            </Card>
          ) : (
            activeChallenges.map((challenge) => (
              <ChallengeCard key={challenge.id} challenge={challenge} />
            ))
          )}
        </TabsContent>

        <TabsContent value="upcoming" className="space-y-4">
          {upcomingChallenges.length === 0 ? (
            <Card className="p-8 sm:p-12">
              <div className="text-center text-muted-foreground">
                <Clock className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 opacity-50" />
                <p className="text-base sm:text-lg">No upcoming challenges</p>
                <p className="text-sm">Stay tuned for future opportunities!</p>
              </div>
            </Card>
          ) : (
            upcomingChallenges.map((challenge) => (
              <Card key={challenge.id} className="hover-elevate" data-testid={`challenge-card-upcoming-${challenge.id}`}>
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        {getStatusBadge(challenge.status)}
                        <Badge variant="outline" className={`${getDifficultyColor(challenge.difficulty)} text-white`}>
                          {challenge.difficulty}
                        </Badge>
                        {challenge.category && <Badge variant="secondary">{challenge.category}</Badge>}
                      </div>
                      <CardTitle className="text-xl sm:text-2xl mb-2">{challenge.title}</CardTitle>
                      <CardDescription>{challenge.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {challenge.startDate && (
                    <div className="flex items-center gap-2 text-sm p-3 bg-blue-500/10 rounded-md">
                      <Calendar className="h-4 w-4 text-blue-600" />
                      <span className="font-medium">Starts: {format(new Date(challenge.startDate), "MMM d, yyyy")}</span>
                    </div>
                  )}
                  {challenge.prizes && (
                    <div className="p-3 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-md">
                      <div className="flex items-start gap-2">
                        <Trophy className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-sm mb-1">Prizes</p>
                          <p className="text-sm text-muted-foreground">{challenge.prizes}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {completedChallenges.length === 0 ? (
            <Card className="p-8 sm:p-12">
              <div className="text-center text-muted-foreground">
                <Trophy className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 opacity-50" />
                <p className="text-base sm:text-lg">No completed challenges yet</p>
                <p className="text-sm">Completed challenges will appear here once they close.</p>
              </div>
            </Card>
          ) : (
            completedChallenges.map((challenge) => (
              <ChallengeCard key={challenge.id} challenge={challenge} showActions={false} />
            ))
          )}
        </TabsContent>

        <TabsContent value="my-challenges" className="space-y-4">
          {myParticipations.length === 0 ? (
            <Card className="p-8 sm:p-12">
              <div className="text-center text-muted-foreground">
                <Trophy className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 opacity-50" />
                <p className="text-base sm:text-lg">You haven't joined any challenges yet</p>
                <p className="text-sm">Check out the active challenges and join one to get started!</p>
              </div>
            </Card>
          ) : (
            myParticipations.map((participation) => {
              const challenge = participation.challenge;
              const deadlinePassed = isDeadlinePassed(challenge.endDate);
              const submitted = !!participation.submittedAt;
              const canEdit = submitted && !deadlinePassed && challenge.status !== "completed";
              const resultsPublished = challenge.resultsPublished === 1;
              const rankInfo = participation.rank ? getRankInfo(participation.rank) : null;

              return (
                <Card key={participation.id} className="hover-elevate" data-testid={`my-challenge-${participation.id}`}>
                  <CardHeader>
                    <div className="flex items-start gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          {getStatusBadge(challenge.status)}
                          {submitted && (
                            <Badge className="bg-green-600">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Submitted
                            </Badge>
                          )}
                          {resultsPublished && rankInfo && (
                            <Badge className={rankInfo.color}>
                              <rankInfo.icon className="h-3 w-3 mr-1" />
                              {rankInfo.label}
                            </Badge>
                          )}
                        </div>
                        <CardTitle className="text-lg sm:text-xl mb-1">{challenge.title}</CardTitle>
                        <CardDescription className="text-sm">{challenge.description}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Joined:</span>
                        <span className="font-medium">{format(new Date(participation.joinedAt), "MMM d, yyyy")}</span>
                      </div>
                      {submitted && participation.submittedAt && (
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-muted-foreground">Submitted:</span>
                          <span className="font-medium">{format(new Date(participation.submittedAt), "MMM d, yyyy")}</span>
                        </div>
                      )}
                      {challenge.endDate && (
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Deadline:</span>
                          <span className={`font-medium ${deadlinePassed ? "text-red-500" : ""}`}>
                            {deadlinePassed ? "Closed" : format(new Date(challenge.endDate), "MMM d, yyyy")}
                          </span>
                        </div>
                      )}
                    </div>

                    {(participation.submissionUrl || participation.submissionDescription) && (
                      <div className="p-3 bg-muted rounded-md space-y-2">
                        <p className="text-sm font-medium">Your Submission</p>
                        {participation.submissionUrl && (
                          <a
                            href={participation.submissionUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline flex items-center gap-1 break-all"
                            data-testid={`link-submission-${participation.id}`}
                          >
                            <ExternalLink className="h-3 w-3 flex-shrink-0" />
                            {participation.submissionUrl}
                          </a>
                        )}
                        {participation.submissionDescription && (
                          <p className="text-sm text-muted-foreground">{participation.submissionDescription}</p>
                        )}
                      </div>
                    )}

                    {resultsPublished && (
                      <div className="border rounded-lg p-4 space-y-3 bg-gradient-to-r from-purple-500/5 to-pink-500/5">
                        <p className="font-semibold text-sm flex items-center gap-2">
                          <Trophy className="h-4 w-4 text-yellow-500" />
                          Your Results
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                          {participation.rank && (
                            <div data-testid={`result-rank-${participation.id}`}>
                              <p className="text-xs text-muted-foreground mb-1">Rank</p>
                              <Badge className={`${getRankInfo(participation.rank).color} text-sm px-2 py-1`}>
                                {getRankInfo(participation.rank).label}
                              </Badge>
                            </div>
                          )}
                          {participation.score !== null && participation.score !== undefined && (
                            <div data-testid={`result-score-${participation.id}`}>
                              <p className="text-xs text-muted-foreground mb-1">Score</p>
                              <p className="font-bold text-lg">
                                {participation.score}
                                <span className="text-sm font-normal text-muted-foreground">/100</span>
                              </p>
                            </div>
                          )}
                        </div>
                        {participation.feedback && (
                          <div data-testid={`result-feedback-${participation.id}`}>
                            <p className="text-xs text-muted-foreground mb-1">Organizer Feedback</p>
                            <p className="text-sm bg-background rounded p-2 border">{participation.feedback}</p>
                          </div>
                        )}
                        {!participation.rank && !participation.score && !participation.feedback && (
                          <p className="text-sm text-muted-foreground">
                            Results are published — your evaluation is being finalized.
                          </p>
                        )}
                      </div>
                    )}

                    <div className="flex gap-2">
                      {!submitted && challenge.status === "active" && !deadlinePassed && (
                        <Button
                          onClick={() => openSubmitDialog(challenge, participation)}
                          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                          data-testid={`button-submit-participation-${participation.id}`}
                        >
                          Submit Work
                        </Button>
                      )}
                      {canEdit && (
                        <Button
                          variant="outline"
                          onClick={() => openSubmitDialog(challenge, participation)}
                          data-testid={`button-edit-participation-${participation.id}`}
                        >
                          <Edit2 className="h-4 w-4 mr-2" />
                          Edit Submission
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={submitDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setSubmitDialogOpen(false);
          setDialogChallenge(null);
        }
      }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto w-[calc(100%-2rem)] sm:w-auto max-w-lg" data-testid="dialog-submit-work">
          <DialogHeader>
            <DialogTitle>{isEditMode ? "Edit Your Submission" : "Submit Your Work"}</DialogTitle>
            <DialogDescription>
              {isEditMode
                ? "Update your submission before the deadline closes."
                : "Share your project link and/or a description for this challenge."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="submission-url">Submission URL</Label>
              <Input
                id="submission-url"
                type="url"
                placeholder="https://github.com/yourusername/project"
                value={submissionUrl}
                onChange={(e) => setSubmissionUrl(e.target.value)}
                data-testid="input-submission-url"
              />
              <p className="text-xs text-muted-foreground">
                GitHub repo, live demo, video, or any public link (optional if description provided)
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="submission-description">Description</Label>
              <Textarea
                id="submission-description"
                placeholder="Describe your approach, what you built, and any key highlights..."
                value={submissionDescription}
                onChange={(e) => setSubmissionDescription(e.target.value)}
                className="min-h-[100px] resize-none"
                data-testid="input-submission-description"
              />
            </div>
            <Button
              onClick={handleSubmit}
              disabled={(!submissionUrl && !submissionDescription) || submitMutation.isPending}
              className="w-full"
              data-testid="button-confirm-submit"
            >
              {submitMutation.isPending
                ? (isEditMode ? "Updating..." : "Submitting...")
                : (isEditMode ? "Update Submission" : "Submit Work")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
