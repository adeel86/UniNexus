import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { User, RecruiterFeedback, insertChallengeSchema, Challenge } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export const challengeFormSchema = z.object({
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

export const feedbackFormSchema = z.object({
  rating: z.coerce.number().min(1, "Rating is required").max(5),
  category: z.enum(["technical_skills", "soft_skills", "problem_solving", "communication", "leadership", "teamwork"]),
  feedback: z.string().min(10, "Feedback must be at least 10 characters"),
  context: z.enum(["challenge", "interview", "project_review", "general"]).optional(),
  isPublic: z.boolean().default(true),
});

export type ChallengeFormData = z.infer<typeof challengeFormSchema>;
export type FeedbackFormData = z.infer<typeof feedbackFormSchema>;

export interface FeedbackWithStudent extends RecruiterFeedback {
  student?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    major: string | null;
    university: string | null;
    engagementScore: number | null;
  };
}

export interface Participant {
  id: string;
  rank?: number;
  submittedAt: string;
  submissionUrl?: string;
  user?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    profileImageUrl: string | null;
  };
}

export function useIndustryDashboard() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [isChallengeModalOpen, setIsChallengeModalOpen] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<User | null>(null);
  const [isRankingModalOpen, setIsRankingModalOpen] = useState(false);
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);

  const challengeForm = useForm<ChallengeFormData>({
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

  const { data: myChallenges = [] } = useQuery<Challenge[]>({
    queryKey: ["/api/challenges"],
  });

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
      challengeForm.reset();
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

  const fetchParticipants = async (challengeId: string) => {
    try {
      const response = await apiRequest("GET", `/api/challenges/${challengeId}/participants`);
      const data = await response.json();
      setParticipants(data.filter((p: Participant) => p.submittedAt !== null));
    } catch (error) {
      console.error("Failed to fetch participants:", error);
    }
  };

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

  const openRankingModal = async (challenge: Challenge) => {
    setSelectedChallenge(challenge);
    await fetchParticipants(challenge.id);
    setIsRankingModalOpen(true);
  };

  const handleAwardRank = (participantId: string, rank: number) => {
    awardRankMutation.mutate({ participantId, rank });
  };

  const openFeedbackModal = (student: User) => {
    setSelectedStudent(student);
    setIsFeedbackModalOpen(true);
  };

  const closeFeedbackModal = () => {
    setIsFeedbackModalOpen(false);
    setSelectedStudent(null);
    feedbackForm.reset();
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

  return {
    searchTerm,
    setSearchTerm,
    isChallengeModalOpen,
    setIsChallengeModalOpen,
    isFeedbackModalOpen,
    setIsFeedbackModalOpen,
    isRankingModalOpen,
    setIsRankingModalOpen,
    selectedStudent,
    selectedChallenge,
    participants,
    challengeForm,
    feedbackForm,
    students,
    myFeedback,
    feedbackLoading,
    myChallenges,
    filteredStudents,
    createChallengeMutation,
    submitFeedbackMutation,
    awardRankMutation,
    handleCreateChallenge,
    handleSubmitFeedback,
    openRankingModal,
    handleAwardRank,
    openFeedbackModal,
    closeFeedbackModal,
  };
}

export function getCategoryLabel(category: string) {
  const labels: Record<string, string> = {
    technical_skills: "Technical Skills",
    soft_skills: "Soft Skills",
    problem_solving: "Problem Solving",
    communication: "Communication",
    leadership: "Leadership",
    teamwork: "Teamwork",
  };
  return labels[category] || category;
}

export function getContextLabel(context: string | null) {
  if (!context) return "General";
  const labels: Record<string, string> = {
    challenge: "Challenge",
    interview: "Interview",
    project_review: "Project Review",
    general: "General",
  };
  return labels[context] || context;
}

export function getRankLabel(rank: number) {
  switch (rank) {
    case 1: return { label: "1st Place", points: "+500 pts", color: "bg-yellow-500" };
    case 2: return { label: "2nd Place", points: "+300 pts", color: "bg-gray-400" };
    case 3: return { label: "3rd Place", points: "+200 pts", color: "bg-orange-600" };
    default: return { label: `#${rank}`, points: "", color: "bg-muted" };
  }
}
