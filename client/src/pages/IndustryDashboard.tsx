import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { User, RecruiterFeedback, insertChallengeSchema, Challenge } from "@shared/schema";
import { UserAvatar } from "@/components/UserAvatar";
import { Badge } from "@/components/ui/badge";
import { Search, Briefcase, Users, Trophy, Plus, Calendar, TrendingUp, MessageSquare, Star, ClipboardList, Award, Medal, ExternalLink } from "lucide-react";
import { UniversalFeed } from "@/components/UniversalFeed";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const challengeFormSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  requiredSkills: z.string().min(1, "At least one skill is required"),
  prizePool: z.coerce.number().min(0, "Prize pool must be a positive number"),
  deadline: z.string().min(1, "Deadline is required").refine((val) => {
    const date = new Date(val);
    return date > new Date();
  }, "Deadline must be in the future"),
  difficultyLevel: z.enum(["beginner", "intermediate", "advanced"]),
});

const feedbackFormSchema = z.object({
  rating: z.coerce.number().min(1, "Rating is required").max(5),
  category: z.enum(["technical_skills", "soft_skills", "problem_solving", "communication", "leadership", "teamwork"]),
  feedback: z.string().min(10, "Feedback must be at least 10 characters"),
  context: z.enum(["challenge", "interview", "project_review", "general"]).optional(),
  isPublic: z.boolean().default(true),
});

type ChallengeFormData = z.infer<typeof challengeFormSchema>;
type FeedbackFormData = z.infer<typeof feedbackFormSchema>;

interface FeedbackWithStudent extends RecruiterFeedback {
  student?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    major: string | null;
    university: string | null;
    engagementScore: number | null;
  };
}

export default function IndustryDashboard() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isChallengeModalOpen, setIsChallengeModalOpen] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<User | null>(null);
  const { toast } = useToast();

  const form = useForm<ChallengeFormData>({
    resolver: zodResolver(challengeFormSchema),
    mode: "onChange",
    defaultValues: {
      title: "",
      description: "",
      requiredSkills: "",
      prizePool: 0,
      deadline: "",
      difficultyLevel: "intermediate",
    },
  });

  const feedbackForm = useForm<FeedbackFormData>({
    resolver: zodResolver(feedbackFormSchema),
    mode: "onChange",
    defaultValues: {
      rating: 3,
      category: "technical_skills",
      feedback: "",
      context: "general",
      isPublic: true,
    },
  });

  const { data: students = [] } = useQuery<User[]>({
    queryKey: ["/api/students"],
  });

  const { data: myFeedback = [], isLoading: feedbackLoading } = useQuery<FeedbackWithStudent[]>({
    queryKey: ["/api/recruiter-feedback/my-feedback"],
  });

  // Fetch challenges organized by this user
  const { data: myChallenges = [] } = useQuery<Challenge[]>({
    queryKey: ["/api/challenges"],
  });

  // State for ranking modal
  const [isRankingModalOpen, setIsRankingModalOpen] = useState(false);
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
  const [participants, setParticipants] = useState<any[]>([]);

  const createChallengeMutation = useMutation({
    mutationFn: async (data: z.infer<typeof insertChallengeSchema>) => {
      return await apiRequest("POST", "/api/challenges", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/challenges"] });
      toast({
        title: "Success!",
        description: "Challenge created successfully",
      });
      setIsChallengeModalOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create challenge",
        variant: "destructive",
      });
    },
  });

  const submitFeedbackMutation = useMutation({
    mutationFn: async (data: FeedbackFormData & { studentId: string }) => {
      return await apiRequest("POST", "/api/recruiter-feedback", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recruiter-feedback/my-feedback"] });
      toast({
        title: "Feedback Submitted",
        description: "Your feedback has been recorded successfully",
      });
      setIsFeedbackModalOpen(false);
      setSelectedStudent(null);
      feedbackForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit feedback",
        variant: "destructive",
      });
    },
  });

  const handleCreateChallenge = (data: ChallengeFormData) => {
    createChallengeMutation.mutate({
      title: data.title,
      description: `${data.description}\n\nRequired Skills: ${data.requiredSkills}`,
      difficulty: data.difficultyLevel,
      prizes: `Prize Pool: $${data.prizePool}`,
      endDate: new Date(data.deadline),
      startDate: new Date(),
      status: "active",
      category: "industry_challenge",
    });
  };

  const handleSubmitFeedback = (data: FeedbackFormData) => {
    if (!selectedStudent) return;
    submitFeedbackMutation.mutate({
      ...data,
      studentId: selectedStudent.id,
    });
  };

  // Fetch participants for a challenge
  const fetchParticipants = async (challengeId: string) => {
    try {
      const response = await apiRequest("GET", `/api/challenges/${challengeId}/participants`);
      const data = await response.json();
      setParticipants(data.filter((p: any) => p.submittedAt !== null));
    } catch (error) {
      console.error("Failed to fetch participants:", error);
    }
  };

  // Award ranking mutation
  const awardRankMutation = useMutation({
    mutationFn: async ({ participantId, rank }: { participantId: string; rank: number }) => {
      return apiRequest("POST", `/api/challenges/${participantId}/award-rank-points`, { rank });
    },
    onSuccess: () => {
      toast({
        title: "Ranking Awarded",
        description: "The participant has been awarded their ranking and points!",
      });
      if (selectedChallenge) {
        fetchParticipants(selectedChallenge.id);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/challenges"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to award ranking",
        variant: "destructive",
      });
    },
  });

  const openRankingModal = async (challenge: Challenge) => {
    setSelectedChallenge(challenge);
    await fetchParticipants(challenge.id);
    setIsRankingModalOpen(true);
  };

  const handleAwardRank = (participantId: string, rank: number) => {
    awardRankMutation.mutate({ participantId, rank });
  };

  const getRankLabel = (rank: number) => {
    switch (rank) {
      case 1: return { label: "1st Place", points: "+500 pts", color: "bg-yellow-500" };
      case 2: return { label: "2nd Place", points: "+300 pts", color: "bg-gray-400" };
      case 3: return { label: "3rd Place", points: "+200 pts", color: "bg-orange-600" };
      default: return { label: `#${rank}`, points: "", color: "bg-muted" };
    }
  };

  const openFeedbackModal = (student: User) => {
    setSelectedStudent(student);
    setIsFeedbackModalOpen(true);
  };

  const filteredStudents = students
    .filter(s => {
      const searchLower = searchTerm.toLowerCase();
      return (
        s.firstName?.toLowerCase().includes(searchLower) ||
        s.lastName?.toLowerCase().includes(searchLower) ||
        s.major?.toLowerCase().includes(searchLower)
      );
    })
    .sort((a, b) => (b.engagementScore || 0) - (a.engagementScore || 0));

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

  const getContextLabel = (context: string | null) => {
    if (!context) return "General";
    const labels: Record<string, string> = {
      challenge: "Challenge",
      interview: "Interview",
      project_review: "Project Review",
      general: "General",
    };
    return labels[context] || context;
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="font-heading text-3xl font-bold mb-2">Industry Partner Dashboard</h1>
        <p className="text-muted-foreground">
          Discover talented students, create challenges, and provide valuable feedback
        </p>
      </div>

      <Tabs defaultValue="analytics" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 max-w-xl">
          <TabsTrigger value="feed" data-testid="tab-feed">
            <MessageSquare className="h-4 w-4 mr-2" />
            Feed
          </TabsTrigger>
          <TabsTrigger value="analytics" data-testid="tab-analytics">
            <TrendingUp className="h-4 w-4 mr-2" />
            Talent
          </TabsTrigger>
          <TabsTrigger value="challenges" data-testid="tab-challenges">
            <Trophy className="h-4 w-4 mr-2" />
            Challenges
          </TabsTrigger>
          <TabsTrigger value="feedback" data-testid="tab-feedback">
            <ClipboardList className="h-4 w-4 mr-2" />
            Feedback
          </TabsTrigger>
        </TabsList>

        <TabsContent value="feed">
          <UniversalFeed role="industry" initialCategory="all" />
        </TabsContent>

        <TabsContent value="challenges">
          <Card className="p-6">
            <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
              <div>
                <h2 className="text-xl font-semibold">Manage Your Challenges</h2>
                <p className="text-sm text-muted-foreground">
                  Award rankings to participants and distribute challenge points
                </p>
              </div>
              <Button onClick={() => setIsChallengeModalOpen(true)} data-testid="button-create-new-challenge">
                <Plus className="h-4 w-4 mr-2" />
                Create Challenge
              </Button>
            </div>

            <div className="space-y-4">
              {myChallenges.filter(c => c.organizerId).length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>You haven't created any challenges yet.</p>
                  <p className="text-sm mt-2">Create a challenge to engage with students!</p>
                </div>
              ) : (
                myChallenges.map((challenge) => (
                  <Card key={challenge.id} className="p-5" data-testid={`challenge-manage-${challenge.id}`}>
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
                          onClick={() => openRankingModal(challenge)}
                          data-testid={`button-manage-rankings-${challenge.id}`}
                        >
                          <Award className="h-4 w-4 mr-2" />
                          Award Rankings
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="feedback">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Feedback You've Given</h2>
            {feedbackLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading feedback...</div>
            ) : myFeedback.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>You haven't given any feedback yet.</p>
                <p className="text-sm mt-2">Go to the Talent tab to provide feedback to students.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {myFeedback.map((fb) => (
                  <Card key={fb.id} className="p-4" data-testid={`feedback-${fb.id}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold">
                            {fb.student?.firstName} {fb.student?.lastName}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            {getCategoryLabel(fb.category)}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {getContextLabel(fb.context)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1 mb-2">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`h-4 w-4 ${
                                star <= fb.rating
                                  ? "fill-yellow-500 text-yellow-500"
                                  : "text-muted-foreground"
                              }`}
                            />
                          ))}
                          <span className="text-sm text-muted-foreground ml-1">
                            {fb.rating}/5
                          </span>
                        </div>
                        <p className="text-sm">{fb.feedback}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          {fb.student?.university && <span>{fb.student.university}</span>}
                          {fb.student?.major && <span>{fb.student.major}</span>}
                          {fb.createdAt && (
                            <span>
                              {new Date(fb.createdAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Available Talent</p>
                  <p className="text-3xl font-bold">{students.length}</p>
                </div>
                <Users className="h-8 w-8 text-primary" />
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Feedback Given</p>
                  <p className="text-3xl font-bold">{myFeedback.length}</p>
                </div>
                <ClipboardList className="h-8 w-8 text-green-600" />
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Challenges</p>
                  <p className="text-3xl font-bold">3</p>
                </div>
                <Trophy className="h-8 w-8 text-yellow-600" />
              </div>
            </Card>

            {/* <Card className="p-6 bg-gradient-to-br from-purple-600 to-pink-600 text-white">
              <Button
                className="w-full bg-white/20 text-white"
                size="lg"
                onClick={() => setIsChallengeModalOpen(true)}
                data-testid="button-create-challenge"
              >
                <Plus className="mr-2 h-5 w-5" />
                Create Challenge
              </Button>
            </Card> */}
          </div>

          <Card className="p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, major, or skills..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                    data-testid="input-search-talent"
                  />
                </div>
              </div>
              <Button variant="outline" data-testid="button-filter">
                <Trophy className="mr-2 h-4 w-4" />
                Top Performers
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredStudents.map((student) => (
                <Card
                  key={student.id}
                  className="p-5 hover-elevate active-elevate-2"
                  data-testid={`talent-${student.id}`}
                >
                  <div className="flex items-start gap-4">
                    <UserAvatar user={student} size="lg" />
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div>
                          <h3 className="font-semibold text-lg">
                            {student.firstName} {student.lastName}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {student.major || "No major specified"}
                          </p>
                          {student.university && (
                            <p className="text-xs text-muted-foreground">
                              {student.university}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => openFeedbackModal(student)}
                            data-testid={`button-feedback-${student.id}`}
                          >
                            <Star className="mr-1 h-4 w-4" />
                            Feedback
                          </Button>
                          <Button size="sm" variant="outline" data-testid={`button-view-${student.id}`}>
                            View
                          </Button>
                        </div>
                      </div>

                      {student.bio && (
                        <p className="text-sm mt-2 line-clamp-2">{student.bio}</p>
                      )}

                      <div className="flex gap-2 mt-3 flex-wrap">
                        <Badge variant="secondary" className="text-xs">
                          Engagement: {student.engagementScore || 0}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          Problem Solver: {student.problemSolverScore || 0}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {student.endorsementScore || 0} Endorsements
                        </Badge>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}

              {filteredStudents.length === 0 && (
                <div className="col-span-full text-center py-12 text-muted-foreground">
                  No students found matching your search
                </div>
              )}
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Feedback Modal */}
      <Dialog open={isFeedbackModalOpen} onOpenChange={setIsFeedbackModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Give Feedback to {selectedStudent?.firstName} {selectedStudent?.lastName}
            </DialogTitle>
            <DialogDescription>
              Provide constructive feedback to help this student grow professionally
            </DialogDescription>
          </DialogHeader>

          <Form {...feedbackForm}>
            <form onSubmit={feedbackForm.handleSubmit(handleSubmitFeedback)} className="space-y-4 py-4">
              <FormField
                control={feedbackForm.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-feedback-category">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="technical_skills">Technical Skills</SelectItem>
                        <SelectItem value="soft_skills">Soft Skills</SelectItem>
                        <SelectItem value="problem_solving">Problem Solving</SelectItem>
                        <SelectItem value="communication">Communication</SelectItem>
                        <SelectItem value="leadership">Leadership</SelectItem>
                        <SelectItem value="teamwork">Teamwork</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={feedbackForm.control}
                name="rating"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rating *</FormLabel>
                    <div className="flex items-center gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => field.onChange(star)}
                          className="focus:outline-none"
                          data-testid={`star-${star}`}
                        >
                          <Star
                            className={`h-8 w-8 transition-colors ${
                              star <= field.value
                                ? "fill-yellow-500 text-yellow-500"
                                : "text-muted-foreground hover:text-yellow-400"
                            }`}
                          />
                        </button>
                      ))}
                      <span className="ml-2 text-lg font-medium">{field.value}/5</span>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={feedbackForm.control}
                name="context"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Context</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-feedback-context">
                          <SelectValue placeholder="Select context" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="general">General Observation</SelectItem>
                        <SelectItem value="challenge">Challenge Participation</SelectItem>
                        <SelectItem value="interview">Interview</SelectItem>
                        <SelectItem value="project_review">Project Review</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={feedbackForm.control}
                name="feedback"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Feedback *</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Share your observations and suggestions for improvement..."
                        className="min-h-[120px]"
                        data-testid="textarea-feedback"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsFeedbackModalOpen(false);
                    setSelectedStudent(null);
                    feedbackForm.reset();
                  }}
                  data-testid="button-cancel-feedback"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitFeedbackMutation.isPending || !feedbackForm.formState.isValid}
                  data-testid="button-submit-feedback"
                >
                  {submitFeedbackMutation.isPending ? "Submitting..." : "Submit Feedback"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Ranking Award Modal */}
      <Dialog open={isRankingModalOpen} onOpenChange={setIsRankingModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Award Rankings - {selectedChallenge?.title}
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
              participants.map((participant, index) => (
                <Card key={participant.id} className="p-4" data-testid={`participant-${participant.id}`}>
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                      <UserAvatar user={participant.user} size="md" />
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
                            onClick={() => handleAwardRank(participant.id, 1)}
                            disabled={awardRankMutation.isPending}
                            className="bg-yellow-500 hover:bg-yellow-600"
                            data-testid={`button-award-1st-${participant.id}`}
                          >
                            <Medal className="h-4 w-4 mr-1" />
                            1st
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleAwardRank(participant.id, 2)}
                            disabled={awardRankMutation.isPending}
                            className="bg-gray-400 hover:bg-gray-500"
                            data-testid={`button-award-2nd-${participant.id}`}
                          >
                            <Medal className="h-4 w-4 mr-1" />
                            2nd
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleAwardRank(participant.id, 3)}
                            disabled={awardRankMutation.isPending}
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
            <Button variant="outline" onClick={() => setIsRankingModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Challenge Creation Modal */}
      <Dialog open={isChallengeModalOpen} onOpenChange={setIsChallengeModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Industry Challenge</DialogTitle>
            <DialogDescription>
              Create a challenge for students to showcase their skills and compete for prizes
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleCreateChallenge)} className="space-y-4 py-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Challenge Title *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Build a Full-Stack E-commerce App"
                        data-testid="input-challenge-title"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description *</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Provide detailed challenge requirements, evaluation criteria, and expectations..."
                        className="min-h-[120px]"
                        data-testid="input-challenge-description"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="requiredSkills"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Required Skills (comma-separated) *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., React, Node.js, MongoDB, REST APIs"
                        data-testid="input-challenge-skills"
                        {...field}
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      Separate skills with commas
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="difficultyLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Difficulty Level *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-difficulty">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="beginner">Beginner</SelectItem>
                          <SelectItem value="intermediate">Intermediate</SelectItem>
                          <SelectItem value="advanced">Advanced</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="prizePool"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prize Pool ($) *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          placeholder="e.g., 5000"
                          data-testid="input-prize-pool"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="deadline"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Deadline *</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <Input
                          type="datetime-local"
                          className="pl-10"
                          data-testid="input-deadline"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsChallengeModalOpen(false)}
                  data-testid="button-cancel-challenge"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createChallengeMutation.isPending || !form.formState.isValid}
                  data-testid="button-submit-challenge"
                >
                  {createChallengeMutation.isPending ? "Creating..." : "Create Challenge"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
