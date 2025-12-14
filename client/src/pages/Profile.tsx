import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Shield } from "lucide-react";
import { CertificateShowcase } from "@/components/CertificateShowcase";
import { RecruiterFeedbackSection } from "@/components/RecruiterFeedbackSection";
import { PostCard } from "@/components/PostCard";
import { JobExperienceModal } from "@/components/JobExperienceModal";
import { EducationSection } from "@/components/EducationSection";
import { SkillsSection } from "@/components/SkillsSection";
import { WorkExperienceSection } from "@/components/WorkExperienceSection";
import { StudentCoursesSection } from "@/components/StudentCoursesSection";
import { TeacherValidatedCoursesSection } from "@/components/TeacherValidatedCoursesSection";
import {
  useProfile,
  ProfileHeader,
  FollowersFollowingList,
  AchievementsSection,
  EditProfileModal,
  StudentAcademicInfo,
  TeachingProfile,
  ProfessionalExperience,
  UniversityProfile,
  IndustryProfile,
} from "@/components/profile";

export default function Profile() {
  const { userData: currentUser } = useAuth();
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  
  const params = new URLSearchParams(window.location.search);
  const viewingUserId = params.get('userId');

  const {
    user,
    userLoading,
    isViewingOwnProfile,
    targetUserId,
    isStudentOrTeacher,
    userBadges,
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
  } = useProfile({ currentUser, viewingUserId });

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
      <ProfileHeader
        user={user}
        isViewingOwnProfile={isViewingOwnProfile}
        targetUserId={targetUserId!}
        followersCount={followersData.length}
        followingCount={followingData.length}
        postsCount={userPosts.length}
        followStatus={followStatus}
        followMutation={followMutation}
        onShowFollowers={() => setShowFollowers(!showFollowers)}
        onShowFollowing={() => setShowFollowing(!showFollowing)}
        onEditProfile={() => setShowEditProfileModal(true)}
        currentUser={currentUser}
      />

      {showFollowers && (
        <FollowersFollowingList
          type="followers"
          data={followersData}
          onClose={() => setShowFollowers(false)}
          currentUserId={currentUser?.id}
          isOwnProfile={isViewingOwnProfile}
          targetUserId={targetUserId}
        />
      )}

      {showFollowing && (
        <FollowersFollowingList
          type="following"
          data={followingData}
          onClose={() => setShowFollowing(false)}
          currentUserId={currentUser?.id}
          isOwnProfile={isViewingOwnProfile}
          targetUserId={targetUserId}
        />
      )}

      {user.role === "student" && (
        <>
          <AchievementsSection
            userBadges={userBadges}
            engagementScore={user.engagementScore || 0}
          />
          {targetUserId && (
            <RecruiterFeedbackSection 
              userId={targetUserId} 
              isOwnProfile={isViewingOwnProfile}
            />
          )}
        </>
      )}

      {isStudentOrTeacher && (
        <>
          <div className="mt-6">
            <h2 className="font-heading text-2xl font-semibold mb-4 flex items-center gap-2">
              <Shield className="h-6 w-6 text-purple-600" />
              Digital Certificates ({certifications.length})
            </h2>
            <CertificateShowcase certifications={certifications} />
          </div>

          <div className="mt-6">
            <EducationSection
              educationRecords={educationRecords}
              isOwnProfile={isViewingOwnProfile}
              userId={targetUserId!}
            />
          </div>

          <div className="mt-6">
            <SkillsSection
              userSkills={userSkills}
              isOwnProfile={isViewingOwnProfile}
              userId={targetUserId!}
            />
          </div>

          {user.role === "student" && (
            <>
              <div className="mt-6">
                <WorkExperienceSection
                  isOwnProfile={isViewingOwnProfile}
                  userId={targetUserId!}
                />
              </div>
              <div className="mt-6">
                <StudentCoursesSection
                  isOwnProfile={isViewingOwnProfile}
                  userId={targetUserId!}
                />
              </div>
            </>
          )}

          {user.role === "teacher" && (
            <div className="mt-6">
              <TeacherValidatedCoursesSection 
                teacherId={targetUserId!}
                isOwnProfile={isViewingOwnProfile}
              />
            </div>
          )}
        </>
      )}

      {extendedProfile && (
        <>
          {user.role === "student" && (
            <StudentAcademicInfo extendedProfile={extendedProfile} />
          )}

          {user.role === "teacher" && (
            <>
              <TeachingProfile extendedProfile={extendedProfile} />
              <ProfessionalExperience
                jobExperiences={jobExperiences}
                isViewingOwnProfile={isViewingOwnProfile}
                onAddExperience={openAddJobExperience}
                onEditExperience={openEditJobExperience}
                onDeleteExperience={(id) => deleteJobExperienceMutation.mutate(id)}
              />
            </>
          )}

          {user.role === "university_admin" && (
            <UniversityProfile 
              extendedProfile={extendedProfile} 
              universityName={user.university} 
            />
          )}

          {user.role === "industry_professional" && (
            <IndustryProfile 
              extendedProfile={extendedProfile} 
              companyName={user.company} 
            />
          )}
        </>
      )}

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

      <JobExperienceModal
        open={jobExperienceModalOpen}
        onOpenChange={(open) => {
          if (!open) closeJobExperienceModal();
        }}
        experience={selectedJobExperience}
        userId={targetUserId!}
      />

      {isViewingOwnProfile && user && (
        <EditProfileModal
          user={user}
          open={showEditProfileModal}
          onOpenChange={setShowEditProfileModal}
        />
      )}
    </div>
  );
}
