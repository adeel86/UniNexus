import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, Plus, MessageSquare, GraduationCap, FileCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CreatePostModal } from "@/components/CreatePostModal";
import { SuggestedPosts } from "@/components/SuggestedPosts";
import { UniversalFeed } from "@/components/UniversalFeed";
import { TeacherContentUpload } from "@/components/TeacherContentUpload";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import {
  useTeacherDashboard,
  EndorseModal,
  CertificateModal,
  CareerInsightsModal,
  StudentCard,
  StatsGrid,
  EngagementDistribution,
  TopPerformers,
} from "@/components/teacher-dashboard";

import { TeacherValidatedCoursesSection } from "@/components/TeacherValidatedCoursesSection";
import { useQuery } from "@tanstack/react-query";

export default function TeacherDashboard() {
  const { userData } = useAuth();
  const [, navigate] = useLocation();

  const { data: pendingValidations = [] } = useQuery<any[]>({
    queryKey: ["/api/teacher/pending-validations"],
    enabled: !!userData,
  });

  const {
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
  } = useTeacherDashboard();

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="font-heading text-3xl font-bold mb-2">Teacher Dashboard</h1>
        <p className="text-muted-foreground">
          Monitor student progress, provide endorsements, and engage with the community
        </p>
      </div>

      <Tabs defaultValue="feed" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 max-w-2xl">
          <TabsTrigger value="feed" data-testid="tab-feed">
            <MessageSquare className="h-4 w-4 mr-2" />
            Feed
          </TabsTrigger>
          <TabsTrigger value="analytics" data-testid="tab-analytics">
            <TrendingUp className="h-4 w-4 mr-2" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="materials" data-testid="tab-materials">
            <GraduationCap className="h-4 w-4 mr-2" />
            Courses & Materials
          </TabsTrigger>
        </TabsList>

        <TabsContent value="materials">
          {userData?.id && <TeacherContentUpload teacherId={userData.id} />}
        </TabsContent>

        <TabsContent value="feed">
          <UniversalFeed role="teacher" initialCategory="academic" />
        </TabsContent>

        <TabsContent value="analytics">
          <div className="grid grid-cols-1 gap-6 mb-6">
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <FileCheck className="h-5 w-5 text-orange-500" />
                <h2 className="font-heading text-xl font-semibold">Pending Course Validations</h2>
                {pendingValidations.length > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {pendingValidations.length}
                  </Badge>
                )}
              </div>

              {pendingValidations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                  No pending validation requests
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingValidations.map((item: any) => (
                    <Card key={item.id} className="p-4 flex items-center justify-between">
                      <div>
                        <h3 className="font-bold">{item.courseName}</h3>
                        <p className="text-sm text-muted-foreground">
                          Student: {item.student?.firstName} {item.student?.lastName}
                        </p>
                      </div>
                      <Button 
                        size="sm"
                        onClick={() => navigate(`/profile?userId=${item.student?.id}`)}
                      >
                        Review & Validate
                      </Button>
                    </Card>
                  ))}
                </div>
              )}
            </Card>
          </div>

          <StatsGrid students={students} />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-heading text-xl font-semibold">Students</h2>
                  <Input
                    placeholder="Search students..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="max-w-xs"
                    data-testid="input-search-students"
                  />
                </div>

                <div className="space-y-3">
                  {filteredStudents.map((student) => (
                    <StudentCard
                      key={student.id}
                      student={student}
                      onViewProfile={(s) => navigate(`/profile?userId=${s.id}`)}
                      onEndorse={handleEndorseClick}
                      onIssueCertificate={handleIssueCertificateClick}
                      onCareerInsights={handleCareerInsightsClick}
                    />
                  ))}

                  {filteredStudents.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No students found
                    </div>
                  )}
                </div>
              </Card>
            </div>

            <div className="space-y-6">
              <Button
                onClick={handleCreatePost}
                className="w-full"
                data-testid="button-create-post"
              >
                <Plus className="mr-2 h-4 w-4" />
                Share Educational Content
              </Button>

              <SuggestedPosts onSelectSuggestion={handleSelectSuggestion} />

              <EngagementDistribution
                ranges={engagementRanges}
                totalStudents={students.length}
              />

              <TopPerformers students={topStudents} />
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <EndorseModal
        open={endorseModalOpen}
        onOpenChange={setEndorseModalOpen}
        student={selectedStudent}
        skills={skills}
        selectedSkill={selectedSkill}
        onSkillChange={setSelectedSkill}
        comment={endorsementComment}
        onCommentChange={setEndorsementComment}
        onSubmit={() => endorseMutation.mutate()}
        isPending={endorseMutation.isPending}
      />

      <CertificateModal
        open={certificateModalOpen}
        onOpenChange={setCertificateModalOpen}
        student={selectedStudent}
        form={certificateForm}
        onFormChange={setCertificateForm}
        onSubmit={() => certificateMutation.mutate()}
        isPending={certificateMutation.isPending}
      />

      <CareerInsightsModal
        open={careerInsightsModalOpen}
        onOpenChange={setCareerInsightsModalOpen}
        student={selectedStudent}
        insights={careerInsights}
        isLoading={careerInsightsLoading}
      />

      <CreatePostModal
        open={createPostOpen}
        onOpenChange={setCreatePostOpen}
        initialContent={postInitialValues.content}
        initialCategory={postInitialValues.category}
        initialTags={postInitialValues.tags}
      />
    </div>
  );
}
