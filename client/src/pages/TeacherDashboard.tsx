import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { User, Endorsement, Skill } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/UserAvatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, Award, Users, Target, Plus, Shield, Sparkles, MessageSquare, FileText, GraduationCap } from "lucide-react";
import { useState } from "react";
import { CreatePostModal } from "@/components/CreatePostModal";
import { SuggestedPosts } from "@/components/SuggestedPosts";
import { UniversalFeed } from "@/components/UniversalFeed";
import {
  Dialog,
  DialogContent,
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TeacherContentUpload } from "@/components/TeacherContentUpload";
import { TeacherCreatedCourses } from "@/components/TeacherCreatedCourses";
import { useAuth } from "@/hooks/useAuth";

export default function TeacherDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const { userData } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [endorseModalOpen, setEndorseModalOpen] = useState(false);
  const [certificateModalOpen, setCertificateModalOpen] = useState(false);
  const [careerInsightsModalOpen, setCareerInsightsModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<User | null>(null);
  const [selectedSkill, setSelectedSkill] = useState("");
  const [endorsementComment, setEndorsementComment] = useState("");
  const [createPostOpen, setCreatePostOpen] = useState(false);
  const [postInitialValues, setPostInitialValues] = useState<{ content: string; category: string; tags: string }>({
    content: "",
    category: "academic",
    tags: ""
  });

  // Certificate form state
  const [certType, setCertType] = useState<string>("skill_endorsement");
  const [certTitle, setCertTitle] = useState("");
  const [certDescription, setCertDescription] = useState("");
  const [certMetadata, setCertMetadata] = useState("");
  const [certImageUrl, setCertImageUrl] = useState("");
  const [certExpiresAt, setCertExpiresAt] = useState("");

  const { data: students = [] } = useQuery<User[]>({
    queryKey: ["/api/students"],
  });

  const { data: skills = [] } = useQuery<Skill[]>({
    queryKey: ["/api/skills"],
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
      if (certMetadata.trim()) {
        try {
          metadata = JSON.parse(certMetadata);
        } catch (error) {
          throw new Error("Invalid JSON in metadata field. Please check the format.");
        }
      }
      
      return apiRequest("POST", "/api/certifications", {
        userId: selectedStudent?.id,
        type: certType,
        title: certTitle,
        description: certDescription,
        metadata,
        imageUrl: certImageUrl || undefined,
        expiresAt: certExpiresAt || undefined,
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
      setCertType("skill_endorsement");
      setCertTitle("");
      setCertDescription("");
      setCertMetadata("");
      setCertImageUrl("");
      setCertExpiresAt("");
    },
    onError: (error: any) => {
      toast({
        title: "Failed to issue certificate",
        description: error.message || "Please check the form and try again",
        variant: "destructive",
      });
    },
  });

  // Career insights query
  const { data: careerInsights, isLoading: careerInsightsLoading } = useQuery<{
    summary: string;
    student: { id: string; firstName: string; lastName: string; major?: string; university?: string; rankTier: string };
  }>({
    queryKey: [`/api/ai/career-summary/${selectedStudent?.id}`],
    enabled: careerInsightsModalOpen && !!selectedStudent?.id,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

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

  // Calculate engagement distribution
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

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="font-heading text-3xl font-bold mb-2">Teacher Dashboard</h1>
        <p className="text-muted-foreground">
          Monitor student progress, provide endorsements, and engage with the community
        </p>
      </div>

      <Tabs defaultValue="courses" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 max-w-3xl">
          <TabsTrigger value="courses" data-testid="tab-courses">
            <GraduationCap className="h-4 w-4 mr-2" />
            My Courses
          </TabsTrigger>
          <TabsTrigger value="analytics" data-testid="tab-analytics">
            <TrendingUp className="h-4 w-4 mr-2" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="content" data-testid="tab-content">
            <FileText className="h-4 w-4 mr-2" />
            Materials
          </TabsTrigger>
          <TabsTrigger value="feed" data-testid="tab-feed">
            <MessageSquare className="h-4 w-4 mr-2" />
            Feed
          </TabsTrigger>
        </TabsList>

        <TabsContent value="courses">
          <TeacherCreatedCourses />
        </TabsContent>

        <TabsContent value="feed">
          <UniversalFeed role="teacher" initialCategory="academic" />
        </TabsContent>

        <TabsContent value="content">
          {userData?.id && <TeacherContentUpload teacherId={userData.id} />}
        </TabsContent>

        <TabsContent value="analytics">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Students</p>
              <p className="text-3xl font-bold">{students.length}</p>
            </div>
            <Users className="h-8 w-8 text-primary" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Avg Engagement</p>
              <p className="text-3xl font-bold">
                {Math.round(students.reduce((sum, s) => sum + (s.engagementScore || 0), 0) / students.length) || 0}
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-600" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Active Courses</p>
              <p className="text-3xl font-bold">3</p>
            </div>
            <Target className="h-8 w-8 text-blue-600" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Endorsements Given</p>
              <p className="text-3xl font-bold">24</p>
            </div>
            <Award className="h-8 w-8 text-purple-600" />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Students List */}
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
                <Card
                  key={student.id}
                  className="p-4 hover-elevate"
                  data-testid={`student-${student.id}`}
                >
                  <div className="flex items-center gap-4">
                    <UserAvatar user={student} size="md" />
                    <div className="flex-1">
                      <div className="font-semibold">
                        {student.firstName} {student.lastName}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {student.major || "No major specified"}
                        {student.university && ` · ${student.university}`}
                      </div>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          Engagement: {student.engagementScore || 0}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          Streak: {student.streak || 0}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/profile?userId=${student.id}`)}
                        data-testid={`button-view-profile-${student.id}`}
                      >
                        View Profile
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleEndorseClick(student)}
                        data-testid={`button-endorse-${student.id}`}
                      >
                        <Award className="mr-2 h-4 w-4" />
                        Endorse
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleIssueCertificateClick(student)}
                        data-testid={`button-issue-certificate-${student.id}`}
                      >
                        <Shield className="mr-2 h-4 w-4" />
                        Certificate
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleCareerInsightsClick(student)}
                        data-testid={`button-career-insights-${student.id}`}
                      >
                        <Sparkles className="mr-2 h-4 w-4" />
                        Career Insights
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}

              {filteredStudents.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No students found
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Top Performers and Analytics */}
        <div className="space-y-6">
          {/* Share Content Button */}
          <Button
            onClick={() => {
              setPostInitialValues({ content: "", category: "academic", tags: "" });
              setCreatePostOpen(true);
            }}
            className="w-full"
            data-testid="button-create-post"
          >
            <Plus className="mr-2 h-4 w-4" />
            Share Educational Content
          </Button>

          {/* AI Post Suggestions */}
          <SuggestedPosts
            onSelectSuggestion={(content, category, tags) => {
              setPostInitialValues({ content, category, tags: tags.join(", ") });
              setCreatePostOpen(true);
            }}
          />

          {/* Engagement Distribution */}
          <Card className="p-6">
            <h3 className="font-heading font-semibold text-lg mb-4">
              Engagement Distribution
            </h3>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Excellent (1000+)</span>
                  <span className="font-semibold">{engagementRanges.excellent}</span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-green-500 to-green-600" 
                    style={{ width: `${(engagementRanges.excellent / students.length) * 100}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Good (500-999)</span>
                  <span className="font-semibold">{engagementRanges.good}</span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-blue-600" 
                    style={{ width: `${(engagementRanges.good / students.length) * 100}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Average (100-499)</span>
                  <span className="font-semibold">{engagementRanges.average}</span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-yellow-500 to-yellow-600" 
                    style={{ width: `${(engagementRanges.average / students.length) * 100}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Needs Help (&lt;100)</span>
                  <span className="font-semibold">{engagementRanges.needsHelp}</span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-red-500 to-red-600" 
                    style={{ width: `${(engagementRanges.needsHelp / students.length) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-heading font-semibold text-lg mb-4">
              Top Performers
            </h3>
            <div className="space-y-3">
              {topStudents.map((student, index) => (
                <div key={student.id} className="flex items-center gap-3">
                  <div
                    className={`
                      h-8 w-8 rounded-full flex items-center justify-center font-bold
                      ${index === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-white' : ''}
                      ${index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-500 text-white' : ''}
                      ${index === 2 ? 'bg-gradient-to-br from-amber-700 to-amber-900 text-white' : ''}
                      ${index > 2 ? 'bg-muted' : ''}
                    `}
                  >
                    {index + 1}
                  </div>
                  <UserAvatar user={student} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {student.firstName} {student.lastName}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {student.engagementScore || 0} points
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      {/* Endorsement Modal */}
      <Dialog open={endorseModalOpen} onOpenChange={setEndorseModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl">
              Endorse {selectedStudent?.firstName} {selectedStudent?.lastName}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="skill">Skill (Optional)</Label>
              <Select value={selectedSkill} onValueChange={setSelectedSkill}>
                <SelectTrigger id="skill" data-testid="select-skill">
                  <SelectValue placeholder="Select a skill" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General Endorsement</SelectItem>
                  {skills.map((skill) => (
                    <SelectItem key={skill.id} value={skill.id}>
                      {skill.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="comment">Comment</Label>
              <Textarea
                id="comment"
                placeholder="Share why you're endorsing this student..."
                value={endorsementComment}
                onChange={(e) => setEndorsementComment(e.target.value)}
                className="min-h-[100px]"
                data-testid="textarea-endorsement-comment"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setEndorseModalOpen(false)}
                data-testid="button-cancel-endorsement"
              >
                Cancel
              </Button>
              <Button
                onClick={() => endorseMutation.mutate()}
                disabled={!endorsementComment.trim() || endorseMutation.isPending}
                data-testid="button-submit-endorsement"
              >
                {endorseMutation.isPending ? "Sending..." : "Send Endorsement"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Certificate Issuance Modal */}
      <Dialog open={certificateModalOpen} onOpenChange={setCertificateModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl">
              <Shield className="inline-block mr-2 h-6 w-6" />
              Issue Digital Certificate to {selectedStudent?.firstName} {selectedStudent?.lastName}
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-4 pr-4">
              <div>
                <Label htmlFor="cert-type">Certificate Type</Label>
                <Select value={certType} onValueChange={setCertType}>
                  <SelectTrigger id="cert-type" data-testid="select-cert-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="course_completion">Course Completion</SelectItem>
                    <SelectItem value="project">Project Achievement</SelectItem>
                    <SelectItem value="skill_endorsement">Skill Endorsement</SelectItem>
                    <SelectItem value="achievement">Special Achievement</SelectItem>
                    <SelectItem value="custom">Custom Certificate</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="cert-title">Title *</Label>
                <Input
                  id="cert-title"
                  placeholder="e.g., Advanced Web Development Certificate"
                  value={certTitle}
                  onChange={(e) => setCertTitle(e.target.value)}
                  data-testid="input-cert-title"
                />
              </div>

              <div>
                <Label htmlFor="cert-description">Description *</Label>
                <Textarea
                  id="cert-description"
                  placeholder="Describe the achievement or completion criteria..."
                  value={certDescription}
                  onChange={(e) => setCertDescription(e.target.value)}
                  className="min-h-[100px]"
                  data-testid="textarea-cert-description"
                />
              </div>

              <div>
                <Label htmlFor="cert-metadata">Metadata (JSON, Optional)</Label>
                <Textarea
                  id="cert-metadata"
                  placeholder='{"courseCode": "CS101", "grade": "A", "credits": 3}'
                  value={certMetadata}
                  onChange={(e) => setCertMetadata(e.target.value)}
                  className="min-h-[60px] font-mono text-sm"
                  data-testid="textarea-cert-metadata"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Optional JSON data for additional certificate details
                </p>
              </div>

              <div>
                <Label htmlFor="cert-image-url">Badge Image URL (Optional)</Label>
                <Input
                  id="cert-image-url"
                  placeholder="https://example.com/badge.png"
                  value={certImageUrl}
                  onChange={(e) => setCertImageUrl(e.target.value)}
                  data-testid="input-cert-image-url"
                />
              </div>

              <div>
                <Label htmlFor="cert-expires-at">Expiration Date (Optional)</Label>
                <Input
                  id="cert-expires-at"
                  type="date"
                  value={certExpiresAt}
                  onChange={(e) => setCertExpiresAt(e.target.value)}
                  data-testid="input-cert-expires-at"
                />
              </div>

              <div className="bg-muted/50 p-3 rounded-md">
                <p className="text-sm text-muted-foreground">
                  <Shield className="inline-block mr-1 h-4 w-4" />
                  This certificate will be automatically verified with a SHA-256 hash and minted as an NFT-style digital credential.
                </p>
              </div>
            </div>
          </ScrollArea>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setCertificateModalOpen(false)}
              data-testid="button-cancel-certificate"
            >
              Cancel
            </Button>
            <Button
              onClick={() => certificateMutation.mutate()}
              disabled={!certTitle.trim() || !certDescription.trim() || certificateMutation.isPending}
              data-testid="button-submit-certificate"
            >
              {certificateMutation.isPending ? "Issuing..." : "Issue Certificate"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Career Insights Modal */}
      <Dialog open={careerInsightsModalOpen} onOpenChange={setCareerInsightsModalOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl">
              <Sparkles className="inline-block mr-2 h-6 w-6" />
              AI Career Insights: {selectedStudent?.firstName} {selectedStudent?.lastName}
            </DialogTitle>
          </DialogHeader>

          {careerInsightsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-muted-foreground">Generating career insights...</p>
              </div>
            </div>
          ) : careerInsights ? (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4 pr-4">
                <div className="bg-muted/30 p-4 rounded-md">
                  <div className="flex items-center gap-3 mb-2">
                    <Badge variant="secondary" className="text-sm">
                      {careerInsights.student.major || "Major not specified"}
                    </Badge>
                    <Badge variant="secondary" className="text-sm">
                      {careerInsights.student.university || "University not specified"}
                    </Badge>
                    <Badge className="text-sm capitalize">
                      {careerInsights.student.rankTier} Tier
                    </Badge>
                  </div>
                </div>

                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {careerInsights.summary}
                  </div>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-md">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    <Sparkles className="inline-block mr-1 h-4 w-4" />
                    This AI-generated summary can help guide your employability discussions with {selectedStudent?.firstName}.
                  </p>
                </div>
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Failed to generate career insights. Please try again.
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setCareerInsightsModalOpen(false)}
              data-testid="button-close-career-insights"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
