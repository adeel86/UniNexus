import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Users, Trophy, Plus, TrendingUp, MessageSquare, ClipboardList, Sparkles, MessageCircle } from "lucide-react";
import { UniversalFeed } from "@/components/UniversalFeed";
import {
  useIndustryDashboard,
  TalentCard,
  ChallengeManageCard,
  FeedbackCard,
  CreateChallengeModal,
  FeedbackModal,
  RankingModal,
} from "@/components/industry";

export default function IndustryDashboard() {
  const {
    searchTerm,
    setSearchTerm,
    isChallengeModalOpen,
    setIsChallengeModalOpen,
    isFeedbackModalOpen,
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
    const handleSelectSuggestion = (content: string, category: string, tags: string) => {
      // Implementation for industry suggestion selection if needed
    };

    const handleCreatePost = () => {
      // Implementation for industry post creation if needed
    };

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="font-heading text-3xl font-bold mb-2">Industry Partner Dashboard</h1>
        <p className="text-muted-foreground">
          Discover talented students, create challenges, and provide valuable feedback
        </p>
      </div>

      <Tabs defaultValue="feed" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 max-w-2xl">
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
          <Tabs defaultValue="for-you" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="for-you" className="gap-2">
                <Sparkles className="h-4 w-4" />
                For You
              </TabsTrigger>
              <TabsTrigger value="following" className="gap-2">
                <Users className="h-4 w-4" />
                Following
              </TabsTrigger>
              <TabsTrigger value="my-posts" className="gap-2">
                <MessageCircle className="h-4 w-4" />
                My Posts
              </TabsTrigger>
            </TabsList>
            <TabsContent value="for-you">
              <UniversalFeed role="industry" initialCategory="all" feedType="personalized" />
            </TabsContent>
            <TabsContent value="following">
              <UniversalFeed role="industry" initialCategory="all" feedType="following" />
            </TabsContent>
            <TabsContent value="my-posts">
              <UniversalFeed role="industry" showOnlyOwnPosts={true} feedType="my-posts" />
            </TabsContent>
          </Tabs>
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
                  <ChallengeManageCard
                    key={challenge.id}
                    challenge={challenge}
                    onManageRankings={openRankingModal}
                  />
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
                  <FeedbackCard key={fb.id} feedback={fb} />
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
                <TalentCard
                  key={student.id}
                  student={student}
                  onFeedback={openFeedbackModal}
                />
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

      <FeedbackModal
        open={isFeedbackModalOpen}
        onClose={closeFeedbackModal}
        student={selectedStudent}
        form={feedbackForm}
        onSubmit={handleSubmitFeedback}
        isPending={submitFeedbackMutation.isPending}
      />

      <RankingModal
        open={isRankingModalOpen}
        onOpenChange={setIsRankingModalOpen}
        challenge={selectedChallenge}
        participants={participants}
        onAwardRank={handleAwardRank}
        isPending={awardRankMutation.isPending}
      />

      <CreateChallengeModal
        open={isChallengeModalOpen}
        onOpenChange={setIsChallengeModalOpen}
        form={challengeForm}
        onSubmit={handleCreateChallenge}
        isPending={createChallengeMutation.isPending}
      />
    </div>
  );
}
