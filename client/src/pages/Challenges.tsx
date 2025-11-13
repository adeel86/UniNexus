import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Calendar, Users, Target, Sparkles, CheckCircle, Clock, Award } from "lucide-react";
import { format } from "date-fns";

interface Challenge {
  id: string;
  title: string;
  description: string;
  organizerId: string | null;
  category: string | null;
  difficulty: string;
  prizes: string | null;
  startDate: string | null;
  endDate: string | null;
  participantCount: number;
  status: string;
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
  submittedAt: string | null;
  rank: number | null;
  joinedAt: string;
  challenge: Challenge;
}

export default function Challenges() {
  const { userData } = useAuth();
  const { toast } = useToast();
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
  const [submissionUrl, setSubmissionUrl] = useState("");

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
        title: "Challenge Joined!",
        description: "You've successfully joined the challenge. Good luck!",
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
    mutationFn: async ({ challengeId, submissionUrl }: { challengeId: string; submissionUrl: string }) => {
      const response = await apiRequest("POST", `/api/challenges/${challengeId}/submit`, { submissionUrl });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/challenges/my-participations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      setSubmissionUrl("");
      setSelectedChallenge(null);
      toast({
        title: "Submission Received!",
        description: "Your submission has been recorded successfully.",
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

  const isParticipating = (challengeId: string) => {
    return myParticipations.some(p => p.challengeId === challengeId);
  };

  const hasSubmitted = (challengeId: string) => {
    const participation = myParticipations.find(p => p.challengeId === challengeId);
    return participation?.submittedAt !== null;
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "beginner":
        return "bg-green-500";
      case "intermediate":
        return "bg-yellow-500";
      case "advanced":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-600">Active</Badge>;
      case "upcoming":
        return <Badge className="bg-blue-600">Upcoming</Badge>;
      case "completed":
        return <Badge className="bg-gray-600">Completed</Badge>;
      default:
        return null;
    }
  };

  const activeChallenges = challenges.filter(c => c.status === 'active');
  const upcomingChallenges = challenges.filter(c => c.status === 'upcoming');
  const completedChallenges = challenges.filter(c => c.status === 'completed');

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

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center space-y-2 mb-8">
        <h1 className="font-heading text-4xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent">
          Challenges & Hackathons
        </h1>
        <p className="text-muted-foreground text-lg">
          Join exciting competitions, showcase your skills, and win amazing prizes!
        </p>
      </div>

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
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="active" data-testid="tab-active-challenges">
            Active ({activeChallenges.length})
          </TabsTrigger>
          <TabsTrigger value="upcoming" data-testid="tab-upcoming-challenges">
            Upcoming ({upcomingChallenges.length})
          </TabsTrigger>
          <TabsTrigger value="my-challenges" data-testid="tab-my-challenges">
            My Challenges ({myParticipations.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {activeChallenges.length === 0 ? (
            <Card className="p-12">
              <div className="text-center text-muted-foreground">
                <Sparkles className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-lg">No active challenges at the moment</p>
                <p className="text-sm">Check back soon for new opportunities!</p>
              </div>
            </Card>
          ) : (
            activeChallenges.map((challenge) => (
              <Card key={challenge.id} className="hover-elevate" data-testid={`challenge-card-${challenge.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getStatusBadge(challenge.status)}
                        <Badge variant="outline" className={`${getDifficultyColor(challenge.difficulty)} text-white`}>
                          {challenge.difficulty}
                        </Badge>
                        {challenge.category && (
                          <Badge variant="secondary">{challenge.category}</Badge>
                        )}
                      </div>
                      <CardTitle className="text-2xl mb-2">{challenge.title}</CardTitle>
                      <CardDescription className="text-base">{challenge.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {challenge.organizer && (
                      <div className="flex items-center gap-2 text-sm">
                        <Award className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Organizer:</span>
                        <span className="font-medium">{challenge.organizer.company || challenge.organizer.displayName}</span>
                      </div>
                    )}
                    {challenge.endDate && (
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Ends:</span>
                        <span className="font-medium">{format(new Date(challenge.endDate), "MMM d, yyyy")}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm">
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

                  <div className="flex gap-2">
                    {!isParticipating(challenge.id) ? (
                      <Button
                        onClick={() => joinMutation.mutate(challenge.id)}
                        disabled={joinMutation.isPending}
                        className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                        data-testid={`button-join-${challenge.id}`}
                      >
                        Join Challenge
                      </Button>
                    ) : hasSubmitted(challenge.id) ? (
                      <Button variant="outline" disabled data-testid={`button-submitted-${challenge.id}`}>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Submitted
                      </Button>
                    ) : (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            onClick={() => setSelectedChallenge(challenge)}
                            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                            data-testid={`button-submit-${challenge.id}`}
                          >
                            Submit Work
                          </Button>
                        </DialogTrigger>
                        <DialogContent data-testid="dialog-submit-work">
                          <DialogHeader>
                            <DialogTitle>Submit Your Work</DialogTitle>
                            <DialogDescription>
                              Share the URL to your project or submission for this challenge.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 pt-4">
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
                                Provide a link to your GitHub repo, live demo, or video presentation
                              </p>
                            </div>
                            <Button
                              onClick={() => {
                                if (selectedChallenge) {
                                  submitMutation.mutate({
                                    challengeId: selectedChallenge.id,
                                    submissionUrl,
                                  });
                                }
                              }}
                              disabled={!submissionUrl || submitMutation.isPending}
                              className="w-full"
                              data-testid="button-confirm-submit"
                            >
                              {submitMutation.isPending ? "Submitting..." : "Submit"}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="upcoming" className="space-y-4">
          {upcomingChallenges.length === 0 ? (
            <Card className="p-12">
              <div className="text-center text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-lg">No upcoming challenges</p>
                <p className="text-sm">Stay tuned for future opportunities!</p>
              </div>
            </Card>
          ) : (
            upcomingChallenges.map((challenge) => (
              <Card key={challenge.id} className="hover-elevate" data-testid={`challenge-card-upcoming-${challenge.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getStatusBadge(challenge.status)}
                        <Badge variant="outline" className={`${getDifficultyColor(challenge.difficulty)} text-white`}>
                          {challenge.difficulty}
                        </Badge>
                        {challenge.category && (
                          <Badge variant="secondary">{challenge.category}</Badge>
                        )}
                      </div>
                      <CardTitle className="text-2xl mb-2">{challenge.title}</CardTitle>
                      <CardDescription className="text-base">{challenge.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
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

        <TabsContent value="my-challenges" className="space-y-4">
          {myParticipations.length === 0 ? (
            <Card className="p-12">
              <div className="text-center text-muted-foreground">
                <Trophy className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-lg">You haven't joined any challenges yet</p>
                <p className="text-sm">Check out the active challenges and join one to get started!</p>
              </div>
            </Card>
          ) : (
            myParticipations.map((participation) => (
              <Card key={participation.id} className="hover-elevate" data-testid={`my-challenge-${participation.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getStatusBadge(participation.challenge.status)}
                        {participation.submittedAt && (
                          <Badge className="bg-green-600">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Submitted
                          </Badge>
                        )}
                      </div>
                      <CardTitle className="text-2xl mb-2">{participation.challenge.title}</CardTitle>
                      <CardDescription className="text-base">{participation.challenge.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Joined:</span>
                      <span className="font-medium">{format(new Date(participation.joinedAt), "MMM d, yyyy")}</span>
                    </div>
                    {participation.submittedAt && (
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-muted-foreground">Submitted:</span>
                        <span className="font-medium">{format(new Date(participation.submittedAt), "MMM d, yyyy")}</span>
                      </div>
                    )}
                  </div>

                  {participation.submissionUrl && (
                    <div className="p-3 bg-muted rounded-md">
                      <p className="text-sm font-medium mb-1">Your Submission</p>
                      <a
                        href={participation.submissionUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline break-all"
                        data-testid={`link-submission-${participation.id}`}
                      >
                        {participation.submissionUrl}
                      </a>
                    </div>
                  )}

                  {!participation.submittedAt && participation.challenge.status === 'active' && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          onClick={() => setSelectedChallenge(participation.challenge)}
                          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                          data-testid={`button-submit-participation-${participation.id}`}
                        >
                          Submit Work
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Submit Your Work</DialogTitle>
                          <DialogDescription>
                            Share the URL to your project or submission for this challenge.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 pt-4">
                          <div className="space-y-2">
                            <Label htmlFor="submission-url-2">Submission URL</Label>
                            <Input
                              id="submission-url-2"
                              type="url"
                              placeholder="https://github.com/yourusername/project"
                              value={submissionUrl}
                              onChange={(e) => setSubmissionUrl(e.target.value)}
                              data-testid="input-submission-url-2"
                            />
                            <p className="text-xs text-muted-foreground">
                              Provide a link to your GitHub repo, live demo, or video presentation
                            </p>
                          </div>
                          <Button
                            onClick={() => {
                              if (selectedChallenge) {
                                submitMutation.mutate({
                                  challengeId: selectedChallenge.id,
                                  submissionUrl,
                                });
                              }
                            }}
                            disabled={!submissionUrl || submitMutation.isPending}
                            className="w-full"
                            data-testid="button-confirm-submit-2"
                          >
                            {submitMutation.isPending ? "Submitting..." : "Submit"}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
