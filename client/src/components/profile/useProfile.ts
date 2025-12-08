import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { 
  UserBadge, Badge as BadgeType, Endorsement, Skill, User, 
  Certification, Post, Comment, Reaction, UserSkill, UserProfile, EducationRecord 
} from "@shared/schema";

export type PostWithAuthor = Post & {
  author: User;
  comments: Comment[];
  reactions: Reaction[];
};

interface UseProfileOptions {
  currentUser: User | null | undefined;
  viewingUserId: string | null;
}

export function useProfile({ currentUser, viewingUserId }: UseProfileOptions) {
  const { toast } = useToast();
  
  const isViewingOwnProfile = !viewingUserId || viewingUserId === currentUser?.id;
  const targetUserId = viewingUserId || currentUser?.id;

  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);
  const [jobExperienceModalOpen, setJobExperienceModalOpen] = useState(false);
  const [selectedJobExperience, setSelectedJobExperience] = useState<any>(null);

  const { data: viewedUser, isLoading: userLoading } = useQuery<User>({
    queryKey: [`/api/users/${viewingUserId}`],
    enabled: !!viewingUserId && !isViewingOwnProfile,
  });

  const user = isViewingOwnProfile ? currentUser : viewedUser;
  const isStudent = user?.role === "student";
  const isStudentOrTeacher = currentUser && (currentUser.role === "student" || currentUser.role === "teacher");

  const { data: userBadges = [] } = useQuery<(UserBadge & { badge: BadgeType })[]>({
    queryKey: [`/api/user-badges/${targetUserId}`],
    enabled: !!targetUserId && !!isStudent,
  });

  const { data: endorsements = [] } = useQuery<(Endorsement & { endorser: User, skill?: Skill })[]>({
    queryKey: [`/api/endorsements/${targetUserId}`],
    enabled: !!targetUserId && !!isStudent,
  });

  const { data: certifications = [] } = useQuery<Certification[]>({
    queryKey: [`/api/certifications/user/${targetUserId}`],
    enabled: !!targetUserId && !!isStudentOrTeacher,
  });

  const { data: followersData = [] } = useQuery<any[]>({
    queryKey: [`/api/followers/${targetUserId}`],
    enabled: !!targetUserId,
  });

  const { data: followingData = [] } = useQuery<any[]>({
    queryKey: [`/api/following/${targetUserId}`],
    enabled: !!targetUserId,
  });

  const { data: userPosts = [] } = useQuery<PostWithAuthor[]>({
    queryKey: [`/api/posts`, 'author', targetUserId],
    queryFn: async () => {
      const response = await fetch(`/api/posts?authorId=${targetUserId}`);
      if (!response.ok) throw new Error('Failed to fetch user posts');
      return response.json();
    },
    enabled: !!targetUserId,
  });

  const { data: rawFollowStatus } = useQuery<{ isFollowing: boolean }>({
    queryKey: [`/api/follow/status/${targetUserId}`],
    enabled: !!currentUser && !isViewingOwnProfile,
  });

  const followStatus = rawFollowStatus ? { following: rawFollowStatus.isFollowing } : undefined;

  const { data: extendedProfile } = useQuery<UserProfile>({
    queryKey: [`/api/user-profiles/${targetUserId}`],
    enabled: !!targetUserId,
  });

  const { data: jobExperiences = [] } = useQuery<any[]>({
    queryKey: [`/api/users/${targetUserId}/job-experience`],
    enabled: !!targetUserId && user?.role === 'teacher',
  });

  const { data: educationRecords = [] } = useQuery<EducationRecord[]>({
    queryKey: [`/api/users/${targetUserId}/education`],
    enabled: !!targetUserId && !!isStudentOrTeacher,
  });

  const { data: userSkills = [] } = useQuery<(UserSkill & { skill: Skill })[]>({
    queryKey: [`/api/user-skills/${targetUserId}`],
    enabled: !!targetUserId && !!isStudentOrTeacher,
  });

  const followMutation = useMutation({
    mutationFn: async (action: 'follow' | 'unfollow') => {
      if (action === 'follow') {
        return apiRequest('POST', '/api/follow', { followingId: targetUserId });
      } else {
        return apiRequest('DELETE', `/api/follow/${targetUserId}`, {});
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/follow/status/${targetUserId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/followers/${targetUserId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/following/${currentUser?.id}`] });
    },
  });

  const deleteJobExperienceMutation = useMutation({
    mutationFn: async (experienceId: number) => {
      return apiRequest('DELETE', `/api/job-experience/${experienceId}`, {});
    },
    onMutate: async (experienceId) => {
      await queryClient.cancelQueries({ queryKey: [`/api/users/${targetUserId}/job-experience`] });
      const previousExperiences = queryClient.getQueryData<any[]>([`/api/users/${targetUserId}/job-experience`]);
      queryClient.setQueryData<any[]>(
        [`/api/users/${targetUserId}/job-experience`],
        (old = []) => old.filter(exp => exp.id !== experienceId)
      );
      return { previousExperiences };
    },
    onError: (err, experienceId, context) => {
      queryClient.setQueryData(
        [`/api/users/${targetUserId}/job-experience`],
        context?.previousExperiences
      );
      toast({
        title: 'Error',
        description: 'Failed to delete job experience',
        variant: 'destructive',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${targetUserId}/job-experience`] });
      toast({
        title: 'Success',
        description: 'Job experience deleted successfully',
      });
    },
  });

  const openAddJobExperience = () => {
    setSelectedJobExperience(null);
    setJobExperienceModalOpen(true);
  };

  const openEditJobExperience = (exp: any) => {
    setSelectedJobExperience(exp);
    setJobExperienceModalOpen(true);
  };

  const closeJobExperienceModal = () => {
    setJobExperienceModalOpen(false);
    setSelectedJobExperience(null);
  };

  const handleFollow = () => {
    followMutation.mutate(followStatus?.following ? 'unfollow' : 'follow');
  };

  return {
    user,
    userLoading,
    isViewingOwnProfile,
    targetUserId,
    isStudent,
    isStudentOrTeacher,
    userBadges,
    endorsements,
    certifications,
    followersData,
    followingData,
    userPosts,
    followStatus,
    extendedProfile,
    jobExperiences,
    educationRecords,
    userSkills,
    showFollowers,
    setShowFollowers,
    showFollowing,
    setShowFollowing,
    jobExperienceModalOpen,
    selectedJobExperience,
    followMutation,
    deleteJobExperienceMutation,
    openAddJobExperience,
    openEditJobExperience,
    closeJobExperienceModal,
    handleFollow,
  };
}
