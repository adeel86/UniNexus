import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { UserAvatar } from "@/components/UserAvatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { UserBadge, Badge as BadgeType, Endorsement, Skill, User, Certification, Post, Comment, Reaction, UserSkill } from "@shared/schema";
import { BadgeIcon } from "@/components/BadgeIcon";
import { AchievementTimeline } from "@/components/AchievementTimeline";
import { CertificateShowcase } from "@/components/CertificateShowcase";
import { RecruiterFeedbackSection } from "@/components/RecruiterFeedbackSection";
import { RankTierBadge } from "@/components/RankTierBadge";
import { PostCard } from "@/components/PostCard";
import { EditProfileModal } from "@/components/EditProfileModal";
import { JobExperienceModal } from "@/components/JobExperienceModal";
import { EducationSection } from "@/components/EducationSection";
import { SkillsSection } from "@/components/SkillsSection";
import { WorkExperienceSection } from "@/components/WorkExperienceSection";
import { StudentCoursesSection } from "@/components/StudentCoursesSection";
import { CVExportButton } from "@/components/CVExportButton";
import { TeacherCoursesSection } from "@/components/TeacherCoursesSection";
import { Award, TrendingUp, Zap, Trophy, Clock, Shield, Users, UserPlus, UserMinus, CheckCircle, Edit, Mail, Phone, Globe, Briefcase, GraduationCap, Plus, Trash2 } from "lucide-react";
import { useLocation } from "wouter";
import { useState } from "react";
import type { UserProfile, EducationRecord } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

type PostWithAuthor = Post & {
  author: User;
  comments: Comment[];
  reactions: Reaction[];
};

export default function Profile() {
  const { userData: currentUser } = useAuth();
  const [location] = useLocation();
  
  // Get userId from query params if viewing another user's profile
  const params = new URLSearchParams(window.location.search);
  const viewingUserId = params.get('userId');
  const isViewingOwnProfile = !viewingUserId || viewingUserId === currentUser?.id;
  
  // Determine which user ID to use for queries
  const targetUserId = viewingUserId || currentUser?.id;
  
  // Fetch viewed user data if viewing someone else's profile
  const { data: viewedUser, isLoading: userLoading } = useQuery<User>({
    queryKey: [`/api/users/${viewingUserId}`],
    enabled: !!viewingUserId && !isViewingOwnProfile,
  });
  
  // Use currentUser if viewing own profile, otherwise use viewedUser
  const user = isViewingOwnProfile ? currentUser : viewedUser;

  // Only fetch student-exclusive features (achievements, endorsements, timeline) for students
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

  // Fetch followers and following
  const { data: followersData = [] } = useQuery<any[]>({
    queryKey: [`/api/followers/${targetUserId}`],
    enabled: !!targetUserId,
  });

  const { data: followingData = [] } = useQuery<any[]>({
    queryKey: [`/api/following/${targetUserId}`],
    enabled: !!targetUserId,
  });

  // Fetch user's posts
  const { data: userPosts = [] } = useQuery<PostWithAuthor[]>({
    queryKey: [`/api/posts`, 'author', targetUserId],
    queryFn: async () => {
      const response = await fetch(`/api/posts?authorId=${targetUserId}`);
      if (!response.ok) throw new Error('Failed to fetch user posts');
      return response.json();
    },
    enabled: !!targetUserId,
  });

  // Check follow status if viewing someone else's profile
  const { data: followStatus } = useQuery<{ following: boolean }>({
    queryKey: [`/api/follow/status/${targetUserId}`],
    enabled: !!currentUser && !isViewingOwnProfile,
  });

  // Follow/unfollow mutation
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

  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [jobExperienceModalOpen, setJobExperienceModalOpen] = useState(false);
  const [selectedJobExperience, setSelectedJobExperience] = useState<any>(null);
  const { toast } = useToast();

  // Delete job experience mutation with optimistic updates
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

  // Fetch extended profile data
  const { data: extendedProfile } = useQuery<UserProfile>({
    queryKey: [`/api/user-profiles/${targetUserId}`],
    enabled: !!targetUserId,
  });

  // Fetch job experience for teachers
  const { data: jobExperiences = [] } = useQuery<any[]>({
    queryKey: [`/api/users/${targetUserId}/job-experience`],
    enabled: !!targetUserId && user?.role === 'teacher',
  });

  // Fetch education records (only for students/teachers)
  const { data: educationRecords = [] } = useQuery<EducationRecord[]>({
    queryKey: [`/api/users/${targetUserId}/education`],
    enabled: !!targetUserId && !!isStudentOrTeacher,
  });

  // Fetch user skills (only for students/teachers)
  const { data: userSkills = [] } = useQuery<(UserSkill & { skill: Skill })[]>({
    queryKey: [`/api/user-skills/${targetUserId}`],
    enabled: !!targetUserId && !!isStudentOrTeacher,
  });

  if (userLoading || !user) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-5xl">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading profile...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl">
      {/* Profile Header */}
      <Card className="p-8 mb-6 bg-gradient-to-r from-purple-600 to-pink-600 text-white">
        <div className="flex items-start justify-between gap-6">
          <div className="flex items-start gap-6 flex-1">
            <UserAvatar user={user} size="xl" className="border-4 border-white" />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h1 className="font-heading text-3xl font-bold">
                  {user.firstName} {user.lastName}
                </h1>
                {user.isVerified && (
                  <div className="flex items-center gap-1 bg-blue-500/30 backdrop-blur px-3 py-1 rounded-full">
                    <CheckCircle className="h-5 w-5 fill-white" />
                    <span className="text-sm font-medium">Verified</span>
                  </div>
                )}
              </div>
              {user.major && (
                <p className="text-purple-100 text-lg mb-1">{user.major}</p>
              )}
              {user.university && (
                <p className="text-purple-100 mb-3">{user.university}</p>
              )}
              
              {/* Followers/Following counts */}
              <div className="flex gap-6 mt-4">
                <button 
                  onClick={() => setShowFollowers(!showFollowers)}
                  className="hover-elevate rounded-lg p-2 transition-all"
                  data-testid="button-followers"
                >
                  <div className="text-2xl font-bold">{followersData.length}</div>
                  <div className="text-sm text-purple-100">Followers</div>
                </button>
                <button 
                  onClick={() => setShowFollowing(!showFollowing)}
                  className="hover-elevate rounded-lg p-2 transition-all"
                  data-testid="button-following"
                >
                  <div className="text-2xl font-bold">{followingData.length}</div>
                  <div className="text-sm text-purple-100">Following</div>
                </button>
                <div className="p-2">
                  <div className="text-2xl font-bold">{userPosts.length}</div>
                  <div className="text-sm text-purple-100">Posts</div>
                </div>
              </div>
              
              {user.bio && (
                <p className="text-white/90 mt-4">{user.bio}</p>
              )}
              
              {/* Rank Tier Badge */}
              <div className="mt-4">
                <RankTierBadge 
                  rankTier={user.rankTier as 'bronze' | 'silver' | 'gold' | 'platinum'} 
                  totalPoints={user.totalPoints || 0}
                  size="lg"
                />
              </div>
            </div>
          </div>
          
          {/* CV Export button (only show when viewing own student profile) */}
          {isViewingOwnProfile && user.role === "student" && (
            <div className="flex items-center gap-2 flex-wrap">
              <CVExportButton userId={targetUserId!} />
            </div>
          )}
          
          {/* Follow button (only show when viewing someone else's profile) */}
          {!isViewingOwnProfile && currentUser && (
            <div>
              <Button
                onClick={() => followMutation.mutate(followStatus?.following ? 'unfollow' : 'follow')}
                disabled={followMutation.isPending}
                variant={followStatus?.following ? "outline" : "default"}
                size="lg"
                className={followStatus?.following ? "bg-white/20 backdrop-blur" : "bg-white text-purple-600 hover:bg-white/90"}
                data-testid="button-follow"
              >
                {followMutation.isPending ? (
                  <span className="animate-pulse">...</span>
                ) : followStatus?.following ? (
                  <>
                    <UserMinus className="mr-2 h-5 w-5" />
                    Unfollow
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-5 w-5" />
                    Follow
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Stats - show student-specific stats only for students */}
        {user.role === "student" ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-white/20 backdrop-blur rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-5 w-5" />
                <span className="text-sm">Engagement</span>
              </div>
              <div className="text-2xl font-bold">{user.engagementScore || 0}</div>
            </div>

            <div className="bg-white/20 backdrop-blur rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <Trophy className="h-5 w-5" />
                <span className="text-sm">Problem Solver</span>
              </div>
              <div className="text-2xl font-bold">{user.problemSolverScore || 0}</div>
            </div>

            <div className="bg-white/20 backdrop-blur rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <Award className="h-5 w-5" />
                <span className="text-sm">Endorsements</span>
              </div>
              <div className="text-2xl font-bold">{user.endorsementScore || 0}</div>
            </div>

            <div className="bg-white/20 backdrop-blur rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="h-5 w-5" />
                <span className="text-sm">Streak</span>
              </div>
              <div className="text-2xl font-bold">{user.streak || 0} days</div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="bg-white/20 backdrop-blur rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-5 w-5" />
                <span className="text-sm">Engagement</span>
              </div>
              <div className="text-2xl font-bold">{user.engagementScore || 0}</div>
            </div>

            <div className="bg-white/20 backdrop-blur rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="h-5 w-5" />
                <span className="text-sm">Streak</span>
              </div>
              <div className="text-2xl font-bold">{user.streak || 0} days</div>
            </div>
          </div>
        )}
      </Card>

      {/* Followers List */}
      {showFollowers && (
        <Card className="p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading text-xl font-semibold flex items-center gap-2">
              <Users className="h-5 w-5" />
              Followers ({followersData.length})
            </h3>
            <Button variant="ghost" size="sm" onClick={() => setShowFollowers(false)} data-testid="button-close-followers">
              Close
            </Button>
          </div>
          {followersData.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {followersData.map((item: any) => item.user && (
                <div key={item.user.id} className="flex items-center gap-3 p-3 rounded-lg hover-elevate" data-testid={`follower-${item.user.id}`}>
                  <UserAvatar user={item.user} size="md" />
                  <div className="flex-1">
                    <div className="font-medium">{item.user.firstName} {item.user.lastName}</div>
                    {item.user.major && (
                      <div className="text-sm text-muted-foreground">{item.user.major}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">No followers yet</p>
          )}
        </Card>
      )}

      {/* Following List */}
      {showFollowing && (
        <Card className="p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading text-xl font-semibold flex items-center gap-2">
              <Users className="h-5 w-5" />
              Following ({followingData.length})
            </h3>
            <Button variant="ghost" size="sm" onClick={() => setShowFollowing(false)} data-testid="button-close-following">
              Close
            </Button>
          </div>
          {followingData.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {followingData.map((item: any) => item.user && (
                <div key={item.user.id} className="flex items-center gap-3 p-3 rounded-lg hover-elevate" data-testid={`following-${item.user.id}`}>
                  <UserAvatar user={item.user} size="md" />
                  <div className="flex-1">
                    <div className="font-medium">{item.user.firstName} {item.user.lastName}</div>
                    {item.user.major && (
                      <div className="text-sm text-muted-foreground">{item.user.major}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">Not following anyone yet</p>
          )}
        </Card>
      )}

      {/* Student-exclusive features: Achievements, Endorsements, Achievement Timeline */}
      {user && user.role === "student" && (
        <>
          {/* Badges */}
          <Card className="p-6">
            <h2 className="font-heading text-xl font-semibold mb-4 flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-600" />
              Achievements ({userBadges.length})
            </h2>
            {userBadges.length > 0 ? (
              <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                {userBadges.map((ub) => (
                  <div key={ub.id} className="flex flex-col items-center gap-2">
                    <BadgeIcon badge={ub.badge} size="lg" />
                    <div className="text-xs text-center font-medium">{ub.badge.name}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Trophy className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No badges earned yet</p>
                <p className="text-sm">Keep engaging to unlock achievements!</p>
              </div>
            )}
          </Card>

          {/* Achievement Timeline */}
          <Card className="p-6 mt-6">
            <h2 className="font-heading text-xl font-semibold mb-6 flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              Achievement Timeline
            </h2>
            <AchievementTimeline 
              userBadges={userBadges}
              engagementScore={user.engagementScore || 0}
            />
          </Card>

          {/* Recruiter Feedback Insights */}
          {targetUserId && (
            <RecruiterFeedbackSection 
              userId={targetUserId} 
              isOwnProfile={isViewingOwnProfile}
            />
          )}
        </>
      )}

      {/* Features available for both students and teachers */}
      {user && (user.role === "student" || user.role === "teacher") && (
        <>

          {/* Digital Certificates (NFT-Style) */}
          <div className="mt-6">
            <h2 className="font-heading text-2xl font-semibold mb-4 flex items-center gap-2">
              <Shield className="h-6 w-6 text-purple-600" />
              Digital Certificates ({certifications.length})
            </h2>
            <CertificateShowcase certifications={certifications} />
          </div>

          {/* Education Section */}
          <div className="mt-6">
            <EducationSection
              educationRecords={educationRecords}
              isOwnProfile={isViewingOwnProfile}
              userId={targetUserId!}
            />
          </div>

          {/* Skills Section */}
          <div className="mt-6">
            <SkillsSection
              userSkills={userSkills}
              isOwnProfile={isViewingOwnProfile}
              userId={targetUserId!}
            />
          </div>

          {/* Work Experience Section - Available for students */}
          {user.role === "student" && (
            <div className="mt-6">
              <WorkExperienceSection
                isOwnProfile={isViewingOwnProfile}
                userId={targetUserId!}
              />
            </div>
          )}

          {/* Student Courses Section - For students with teacher validation */}
          {user.role === "student" && (
            <div className="mt-6">
              <StudentCoursesSection
                isOwnProfile={isViewingOwnProfile}
                userId={targetUserId!}
              />
            </div>
          )}

          {/* Teacher Courses Section - For teachers to manage and validate courses */}
          {user.role === "teacher" && isViewingOwnProfile && (
            <div className="mt-6">
              <TeacherCoursesSection />
            </div>
          )}
        </>
      )}

      {/* Extended Profile Information */}
      {extendedProfile && (
        <>
          {user.role === "student" && (extendedProfile.programme || extendedProfile.academicGoals || extendedProfile.careerGoals) && (
            <Card className="p-6 mt-6">
              <h2 className="font-heading text-xl font-semibold mb-4 flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-blue-600" />
                Academic Information
              </h2>
              <div className="space-y-3">
                {extendedProfile.programme && (
                  <div>
                    <h3 className="font-medium text-sm text-muted-foreground">Programme</h3>
                    <p>{extendedProfile.programme}</p>
                  </div>
                )}
                {extendedProfile.yearOfStudy && (
                  <div>
                    <h3 className="font-medium text-sm text-muted-foreground">Year of Study</h3>
                    <p>Year {extendedProfile.yearOfStudy}</p>
                  </div>
                )}
                {extendedProfile.academicGoals && (
                  <div>
                    <h3 className="font-medium text-sm text-muted-foreground">Academic Goals</h3>
                    <p className="whitespace-pre-wrap">{extendedProfile.academicGoals}</p>
                  </div>
                )}
                {extendedProfile.careerGoals && (
                  <div>
                    <h3 className="font-medium text-sm text-muted-foreground">Career Goals</h3>
                    <p className="whitespace-pre-wrap">{extendedProfile.careerGoals}</p>
                  </div>
                )}
              </div>
            </Card>
          )}

          {user.role === "teacher" && (extendedProfile.teachingSubjects || extendedProfile.professionalBio || extendedProfile.specializations) && (
            <Card className="p-6 mt-6">
              <h2 className="font-heading text-xl font-semibold mb-4 flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-purple-600" />
                Teaching Profile
              </h2>
              <div className="space-y-3">
                {extendedProfile.department && (
                  <div>
                    <h3 className="font-medium text-sm text-muted-foreground">Department</h3>
                    <p>{extendedProfile.department}</p>
                  </div>
                )}
                {extendedProfile.teachingSubjects && extendedProfile.teachingSubjects.length > 0 && (
                  <div>
                    <h3 className="font-medium text-sm text-muted-foreground">Teaching Subjects</h3>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {extendedProfile.teachingSubjects.map((subject, i) => (
                        <Badge key={i} variant="secondary">{subject}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {extendedProfile.specializations && extendedProfile.specializations.length > 0 && (
                  <div>
                    <h3 className="font-medium text-sm text-muted-foreground">Specializations</h3>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {extendedProfile.specializations.map((spec, i) => (
                        <Badge key={i} variant="outline">{spec}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {extendedProfile.professionalBio && (
                  <div>
                    <h3 className="font-medium text-sm text-muted-foreground">Professional Biography</h3>
                    <p className="whitespace-pre-wrap">{extendedProfile.professionalBio}</p>
                  </div>
                )}
                {extendedProfile.officeHours && (
                  <div>
                    <h3 className="font-medium text-sm text-muted-foreground">Office Hours</h3>
                    <p>{extendedProfile.officeHours}</p>
                  </div>
                )}
              </div>
            </Card>
          )}

          {user.role === "teacher" && (jobExperiences.length > 0 || isViewingOwnProfile) && (
            <Card className="p-6 mt-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-heading text-xl font-semibold flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-blue-600" />
                  Professional Experience
                </h2>
                {isViewingOwnProfile && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedJobExperience(null);
                      setJobExperienceModalOpen(true);
                    }}
                    data-testid="button-add-job-experience"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Experience
                  </Button>
                )}
              </div>
              {jobExperiences.length > 0 ? (
                <div className="space-y-4">
                  {jobExperiences.map((exp, index) => (
                    <div key={exp.id || index} className="border-l-2 border-muted pl-4 relative group">
                      {isViewingOwnProfile && (
                        <div className="absolute top-0 right-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedJobExperience(exp);
                              setJobExperienceModalOpen(true);
                            }}
                            data-testid={`button-edit-job-experience-${exp.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (confirm('Are you sure you want to delete this job experience?')) {
                                deleteJobExperienceMutation.mutate(exp.id);
                              }
                            }}
                            data-testid={`button-delete-job-experience-${exp.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                      <h3 className="font-semibold">{exp.position}</h3>
                      <p className="text-sm text-muted-foreground">{exp.organization}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {exp.startDate} - {exp.endDate || 'Present'}
                        {exp.isCurrent && <Badge variant="secondary" className="ml-2">Current</Badge>}
                      </p>
                      {exp.description && (
                        <p className="text-sm mt-2 whitespace-pre-wrap">{exp.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : isViewingOwnProfile ? (
                <p className="text-sm text-muted-foreground">
                  No job experience added yet. Click "Add Experience" to get started.
                </p>
              ) : null}
            </Card>
          )}

          {user.role === "university_admin" && extendedProfile.universityMission && (
            <Card className="p-6 mt-6">
              <h2 className="font-heading text-xl font-semibold mb-4 flex items-center gap-2">
                <Globe className="h-5 w-5 text-green-600" />
                About {user.university || "Our University"}
              </h2>
              <div className="space-y-3">
                {extendedProfile.universityMission && (
                  <div>
                    <h3 className="font-medium text-sm text-muted-foreground">Mission</h3>
                    <p className="whitespace-pre-wrap">{extendedProfile.universityMission}</p>
                  </div>
                )}
                {extendedProfile.focusAreas && extendedProfile.focusAreas.length > 0 && (
                  <div>
                    <h3 className="font-medium text-sm text-muted-foreground">Focus Areas</h3>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {extendedProfile.focusAreas.map((area, i) => (
                        <Badge key={i} variant="secondary">{area}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {extendedProfile.opportunitiesOffered && (
                  <div>
                    <h3 className="font-medium text-sm text-muted-foreground">Opportunities Offered</h3>
                    <p className="whitespace-pre-wrap">{extendedProfile.opportunitiesOffered}</p>
                  </div>
                )}
                {(extendedProfile.contactEmail || extendedProfile.contactPhone || extendedProfile.website) && (
                  <div>
                    <h3 className="font-medium text-sm text-muted-foreground mb-2">Contact Information</h3>
                    <div className="space-y-1">
                      {extendedProfile.contactEmail && (
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <a href={`mailto:${extendedProfile.contactEmail}`} className="hover:underline">
                            {extendedProfile.contactEmail}
                          </a>
                        </div>
                      )}
                      {extendedProfile.contactPhone && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <a href={`tel:${extendedProfile.contactPhone}`} className="hover:underline">
                            {extendedProfile.contactPhone}
                          </a>
                        </div>
                      )}
                      {extendedProfile.website && (
                        <div className="flex items-center gap-2 text-sm">
                          <Globe className="h-4 w-4 text-muted-foreground" />
                          <a href={extendedProfile.website} target="_blank" rel="noopener noreferrer" className="hover:underline">
                            {extendedProfile.website}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}

          {user.role === "industry_professional" && extendedProfile.companyMission && (
            <Card className="p-6 mt-6">
              <h2 className="font-heading text-xl font-semibold mb-4 flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-orange-600" />
                About {user.company || "Our Company"}
              </h2>
              <div className="space-y-3">
                {extendedProfile.companyMission && (
                  <div>
                    <h3 className="font-medium text-sm text-muted-foreground">Company Mission</h3>
                    <p className="whitespace-pre-wrap">{extendedProfile.companyMission}</p>
                  </div>
                )}
                {extendedProfile.industryFocus && extendedProfile.industryFocus.length > 0 && (
                  <div>
                    <h3 className="font-medium text-sm text-muted-foreground">Industry Focus</h3>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {extendedProfile.industryFocus.map((focus, i) => (
                        <Badge key={i} variant="secondary">{focus}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {extendedProfile.partnershipOpportunities && (
                  <div>
                    <h3 className="font-medium text-sm text-muted-foreground">Partnership Opportunities</h3>
                    <p className="whitespace-pre-wrap">{extendedProfile.partnershipOpportunities}</p>
                  </div>
                )}
                {extendedProfile.hiringOpportunities && (
                  <div>
                    <h3 className="font-medium text-sm text-muted-foreground">Hiring Opportunities</h3>
                    <p className="whitespace-pre-wrap">{extendedProfile.hiringOpportunities}</p>
                  </div>
                )}
              </div>
            </Card>
          )}
        </>
      )}

      {/* User's Posts */}
      <div className="mt-6">
        <h2 className="font-heading text-2xl font-semibold mb-4">
          Posts ({userPosts.length})
        </h2>
        {userPosts.length > 0 ? (
          <div className="space-y-4">
            {userPosts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        ) : (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">No posts yet</p>
          </Card>
        )}
      </div>

      {/* Edit Profile Modal */}
      <EditProfileModal
        open={editProfileOpen}
        onOpenChange={setEditProfileOpen}
        userId={targetUserId || ""}
        userRole={user.role}
      />

      {/* Job Experience Modal */}
      <JobExperienceModal
        open={jobExperienceModalOpen}
        onOpenChange={(open) => {
          setJobExperienceModalOpen(open);
          if (!open) setSelectedJobExperience(null);
        }}
        experience={selectedJobExperience}
        userId={targetUserId!}
      />
    </div>
  );
}
