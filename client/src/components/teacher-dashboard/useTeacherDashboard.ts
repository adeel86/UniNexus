import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { User, Skill } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export interface CertificateFormState {
  type: string;
  title: string;
  description: string;
  metadata: string;
  imageUrl: string;
  expiresAt: string;
}

export interface PostInitialValues {
  content: string;
  category: string;
  tags: string;
}

export function useTeacherDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [endorseModalOpen, setEndorseModalOpen] = useState(false);
  const [certificateModalOpen, setCertificateModalOpen] = useState(false);
  const [careerInsightsModalOpen, setCareerInsightsModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<User | null>(null);
  const [selectedSkill, setSelectedSkill] = useState("");
  const [endorsementComment, setEndorsementComment] = useState("");
  const [createPostOpen, setCreatePostOpen] = useState(false);
  const [postInitialValues, setPostInitialValues] = useState<PostInitialValues>({
    content: "",
    category: "academic",
    tags: ""
  });

  const [certificateForm, setCertificateForm] = useState<CertificateFormState>({
    type: "skill_endorsement",
    title: "",
    description: "",
    metadata: "",
    imageUrl: "",
    expiresAt: "",
  });

  const { data: students = [] } = useQuery<User[]>({
    queryKey: ["/api/students"],
  });

  const { data: skills = [] } = useQuery<Skill[]>({
    queryKey: ["/api/skills"],
  });

  const { data: careerInsights, isLoading: careerInsightsLoading } = useQuery<{
    summary: string;
    student: { id: string; firstName: string; lastName: string; major?: string; university?: string; rankTier: string };
  }>({
    queryKey: [`/api/ai/career-summary/${selectedStudent?.id}`],
    enabled: careerInsightsModalOpen && !!selectedStudent?.id,
    staleTime: 5 * 60 * 1000,
  });

  const endorseMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/endorsements", {
        endorsedUserId: selectedStudent?.id,
        skillId: selectedSkill === "general" ? null : selectedSkill || null,
        comment: endorsementComment,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/students"] });
      toast({ title: "Endorsement sent successfully!" });
      setEndorseModalOpen(false);
      setEndorsementComment("");
      setSelectedSkill("");
    },
  });

  const certificateMutation = useMutation({
    mutationFn: async () => {
      let metadata;
      if (certificateForm.metadata.trim()) {
        try {
          metadata = JSON.parse(certificateForm.metadata);
        } catch (error) {
          throw new Error("Invalid JSON in metadata field. Please check the format.");
        }
      }
      
      return apiRequest("POST", "/api/certifications", {
        userId: selectedStudent?.id,
        type: certificateForm.type,
        title: certificateForm.title,
        description: certificateForm.description,
        metadata,
        imageUrl: certificateForm.imageUrl || undefined,
        expiresAt: certificateForm.expiresAt || undefined,
        isPublic: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/certifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/students"] });
      toast({ 
        title: "Certificate issued successfully!",
        description: `NFT-style certificate issued to ${selectedStudent?.firstName} ${selectedStudent?.lastName}`
      });
      setCertificateModalOpen(false);
      resetCertificateForm();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to issue certificate",
        description: error.message || "Please check the form and try again",
        variant: "destructive",
      });
    },
  });

  const resetCertificateForm = () => {
    setCertificateForm({
      type: "skill_endorsement",
      title: "",
      description: "",
      metadata: "",
      imageUrl: "",
      expiresAt: "",
    });
  };

  const filteredStudents = students.filter((student) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      student.firstName?.toLowerCase().includes(searchLower) ||
      student.lastName?.toLowerCase().includes(searchLower) ||
      student.major?.toLowerCase().includes(searchLower)
    );
  });

  const topStudents = [...students]
    .sort((a, b) => (b.engagementScore || 0) - (a.engagementScore || 0))
    .slice(0, 5);

  const engagementRanges = {
    excellent: students.filter(s => (s.engagementScore || 0) >= 1000).length,
    good: students.filter(s => (s.engagementScore || 0) >= 500 && (s.engagementScore || 0) < 1000).length,
    average: students.filter(s => (s.engagementScore || 0) >= 100 && (s.engagementScore || 0) < 500).length,
    needsHelp: students.filter(s => (s.engagementScore || 0) < 100).length,
  };

  const handleEndorseClick = (student: User) => {
    setSelectedStudent(student);
    setEndorseModalOpen(true);
  };

  const handleIssueCertificateClick = (student: User) => {
    setSelectedStudent(student);
    setCertificateModalOpen(true);
  };

  const handleCareerInsightsClick = (student: User) => {
    setSelectedStudent(student);
    setCareerInsightsModalOpen(true);
  };

  const handleCreatePost = () => {
    setPostInitialValues({ content: "", category: "academic", tags: "" });
    setCreatePostOpen(true);
  };

  const handleSelectSuggestion = (content: string, category: string, tags: string[]) => {
    setPostInitialValues({ content, category, tags: tags.join(", ") });
    setCreatePostOpen(true);
  };

  return {
    searchTerm,
    setSearchTerm,
    endorseModalOpen,
    setEndorseModalOpen,
    certificateModalOpen,
    setCertificateModalOpen,
    careerInsightsModalOpen,
    setCareerInsightsModalOpen,
    selectedStudent,
    selectedSkill,
    setSelectedSkill,
    endorsementComment,
    setEndorsementComment,
    createPostOpen,
    setCreatePostOpen,
    postInitialValues,
    certificateForm,
    setCertificateForm,
    students,
    skills,
    careerInsights,
    careerInsightsLoading,
    endorseMutation,
    certificateMutation,
    filteredStudents,
    topStudents,
    engagementRanges,
    handleEndorseClick,
    handleIssueCertificateClick,
    handleCareerInsightsClick,
    handleCreatePost,
    handleSelectSuggestion,
  };
}
