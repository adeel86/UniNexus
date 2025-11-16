import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useState } from "react";
import { 
  MessageSquare, 
  Users, 
  BookOpen, 
  ThumbsUp, 
  Send,
  Award,
  Bot,
  CheckCircle,
  HelpCircle,
  Sparkles
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TeacherAIChat } from "@/components/TeacherAIChat";

type CourseDetails = {
  id: string;
  title: string;
  description: string | null;
  instructorId: string;
  instructor: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
  };
  enrollmentCount: number;
  topDiscussions: Array<{
    id: string;
    title: string;
    content: string;
    upvoteCount: number;
    replyCount: number;
    isResolved: boolean;
    createdAt: string;
    author: {
      id: string;
      firstName: string;
      lastName: string;
      avatarUrl: string | null;
    };
  }>;
};

type Discussion = {
  id: string;
  title: string;
  content: string;
  upvoteCount: number;
  replyCount: number;
  isResolved: boolean;
  createdAt: string;
  author: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
  };
};

export default function CourseDetail() {
  const { courseId } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [newDiscussionTitle, setNewDiscussionTitle] = useState("");
  const [newDiscussionContent, setNewDiscussionContent] = useState("");
  const [showCareerBot, setShowCareerBot] = useState(false);
  const [careerBotMessages, setCareerBotMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [careerBotInput, setCareerBotInput] = useState("");
  const [isCareerBotLoading, setIsCareerBotLoading] = useState(false);
  const [showTeacherAI, setShowTeacherAI] = useState(false);

  // Fetch course details
  const { data: course, isLoading: courseLoading } = useQuery<CourseDetails>({
    queryKey: ["/api/courses", courseId],
    queryFn: async () => {
      const response = await fetch(`/api/courses/${courseId}`);
      if (!response.ok) throw new Error("Failed to fetch course");
      return response.json();
    },
    enabled: !!courseId,
  });

  // Fetch all discussions for this course
  const { data: discussions = [], isLoading: discussionsLoading } = useQuery<Discussion[]>({
    queryKey: ["/api/discussions", courseId],
    queryFn: async () => {
      const response = await fetch(`/api/discussions?courseId=${courseId}`);
      if (!response.ok) throw new Error("Failed to fetch discussions");
      return response.json();
    },
    enabled: !!courseId,
  });

  // Create discussion mutation
  const createDiscussionMutation = useMutation({
    mutationFn: async (data: { title: string; content: string; courseId: string }) => {
      const response = await apiRequest("POST", "/api/discussions", data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/discussions", courseId] });
      queryClient.invalidateQueries({ queryKey: ["/api/courses", courseId] });
      setNewDiscussionTitle("");
      setNewDiscussionContent("");
      toast({
        title: "Discussion created",
        description: "Your discussion has been posted successfully!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // CareerBot chat mutation
  const careerBotMutation = useMutation({
    mutationFn: async (message: string) => {
      setIsCareerBotLoading(true);
      const courseContext = course ? `Course: ${course.title} - ${course.description}` : "";
      const response = await apiRequest("POST", "/api/careerbot/chat", {
        messages: [
          ...careerBotMessages,
          { role: "user", content: `${courseContext}\n\n${message}` }
        ],
      });
      setIsCareerBotLoading(false);
      return await response.json();
    },
    onSuccess: (data: any) => {
      setCareerBotMessages([
        ...careerBotMessages,
        { role: "user", content: careerBotInput },
        { role: "assistant", content: data.message },
      ]);
      setCareerBotInput("");
    },
    onError: (error: Error) => {
      setIsCareerBotLoading(false);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCreateDiscussion = () => {
    if (!newDiscussionTitle.trim() || !newDiscussionContent.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    if (!courseId) return;

    createDiscussionMutation.mutate({
      title: newDiscussionTitle,
      content: newDiscussionContent,
      courseId,
    });
  };

  const handleCareerBotSend = () => {
    if (!careerBotInput.trim()) return;
    careerBotMutation.mutate(careerBotInput);
  };

  if (courseLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-muted-foreground">Loading course...</div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-muted-foreground">Course not found</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Course Header */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <CardTitle className="text-3xl mb-2">{course.title}</CardTitle>
              <CardDescription className="text-base">
                {course.description || "No description available"}
              </CardDescription>
              <div className="flex items-center gap-4 mt-4">
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={course.instructor.avatarUrl || undefined} />
                    <AvatarFallback>
                      {course.instructor.firstName[0]}
                      {course.instructor.lastName[0]}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-muted-foreground">
                    {course.instructor.firstName} {course.instructor.lastName}
                  </span>
                </div>
                <Badge variant="secondary" className="gap-1">
                  <Users className="w-3 h-3" />
                  {course.enrollmentCount} enrolled
                </Badge>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="default"
                className="gap-2"
                onClick={() => setShowTeacherAI(true)}
                data-testid="button-teacher-ai"
              >
                <Sparkles className="w-4 h-4" />
                Ask Teacher's AI
              </Button>
              <Dialog open={showCareerBot} onOpenChange={setShowCareerBot}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2" data-testid="button-careerbot">
                    <Bot className="w-4 h-4" />
                    Career Guide
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Bot className="w-5 h-5" />
                      CareerBot - Learning Assistant
                    </DialogTitle>
                    <DialogDescription>
                      Ask questions about {course.title}, career paths, and learning outcomes
                    </DialogDescription>
                  </DialogHeader>
                  <ScrollArea className="flex-1 pr-4">
                    <div className="space-y-4">
                      {careerBotMessages.length === 0 ? (
                        <div className="text-center text-muted-foreground py-8">
                          <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
                          <p>Start a conversation about this course!</p>
                        </div>
                      ) : (
                        careerBotMessages.map((msg, idx) => (
                          <div
                            key={idx}
                            className={`flex gap-3 ${
                              msg.role === "user" ? "justify-end" : "justify-start"
                            }`}
                          >
                            {msg.role === "assistant" && (
                              <Avatar className="h-8 w-8">
                                <AvatarFallback>
                                  <Bot className="w-4 h-4" />
                                </AvatarFallback>
                              </Avatar>
                            )}
                            <div
                              className={`max-w-[80%] rounded-lg p-3 ${
                                msg.role === "user"
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted"
                              }`}
                            >
                              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                            </div>
                          </div>
                        ))
                      )}
                      {isCareerBotLoading && (
                        <div className="flex gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>
                              <Bot className="w-4 h-4" />
                            </AvatarFallback>
                          </Avatar>
                          <div className="bg-muted rounded-lg p-3">
                            <p className="text-sm text-muted-foreground">Thinking...</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                  <div className="flex gap-2 pt-4 border-t">
                    <Input
                      placeholder="Ask about this course..."
                      value={careerBotInput}
                      onChange={(e) => setCareerBotInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleCareerBotSend()}
                      data-testid="input-careerbot-message"
                    />
                    <Button
                      onClick={handleCareerBotSend}
                      disabled={!careerBotInput.trim() || isCareerBotLoading}
                      data-testid="button-send-careerbot"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Tabs for Discussions and Info */}
      <Tabs defaultValue="discussions" className="space-y-6">
        <TabsList>
          <TabsTrigger value="discussions" className="gap-2">
            <MessageSquare className="w-4 h-4" />
            Discussions
          </TabsTrigger>
          <TabsTrigger value="info" className="gap-2">
            <BookOpen className="w-4 h-4" />
            Course Info
          </TabsTrigger>
        </TabsList>

        <TabsContent value="discussions" className="space-y-6">
          {/* Create Discussion Form */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Start a Discussion</CardTitle>
              <CardDescription>
                Ask questions, share insights, or help others
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="Discussion title..."
                value={newDiscussionTitle}
                onChange={(e) => setNewDiscussionTitle(e.target.value)}
                data-testid="input-discussion-title"
              />
              <Textarea
                placeholder="What's on your mind?"
                value={newDiscussionContent}
                onChange={(e) => setNewDiscussionContent(e.target.value)}
                rows={4}
                data-testid="textarea-discussion-content"
              />
              <Button
                onClick={handleCreateDiscussion}
                disabled={createDiscussionMutation.isPending}
                className="gap-2"
                data-testid="button-create-discussion"
              >
                <Send className="w-4 h-4" />
                {createDiscussionMutation.isPending ? "Posting..." : "Post Discussion"}
              </Button>
            </CardContent>
          </Card>

          {/* Discussions List */}
          {discussionsLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading discussions...
            </div>
          ) : discussions.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No discussions yet. Be the first to start one!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {discussions.map((discussion) => (
                <Card
                  key={discussion.id}
                  className="hover-elevate cursor-pointer"
                  onClick={() => navigate(`/forums/${courseId}/${discussion.id}`)}
                  data-testid={`card-discussion-${discussion.id}`}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <CardTitle className="text-lg">{discussion.title}</CardTitle>
                          {discussion.isResolved && (
                            <Badge variant="default" className="gap-1">
                              <CheckCircle className="w-3 h-3" />
                              Resolved
                            </Badge>
                          )}
                        </div>
                        <CardDescription className="line-clamp-2">
                          {discussion.content}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={discussion.author.avatarUrl || undefined} />
                          <AvatarFallback>
                            {discussion.author.firstName[0]}
                            {discussion.author.lastName[0]}
                          </AvatarFallback>
                        </Avatar>
                        <span>
                          {discussion.author.firstName} {discussion.author.lastName}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <ThumbsUp className="w-4 h-4" />
                        {discussion.upvoteCount}
                      </div>
                      <div className="flex items-center gap-1">
                        <MessageSquare className="w-4 h-4" />
                        {discussion.replyCount} replies
                      </div>
                      <span className="ml-auto">
                        {new Date(discussion.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="info" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>About This Course</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Description</h3>
                <p className="text-muted-foreground">
                  {course.description || "No description available"}
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Instructor</h3>
                <div className="flex items-center gap-2">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={course.instructor.avatarUrl || undefined} />
                    <AvatarFallback>
                      {course.instructor.firstName[0]}
                      {course.instructor.lastName[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">
                      {course.instructor.firstName} {course.instructor.lastName}
                    </p>
                    <p className="text-sm text-muted-foreground">Course Instructor</p>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Course Stats</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-semibold">{course.enrollmentCount}</p>
                      <p className="text-sm text-muted-foreground">Students Enrolled</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-semibold">{discussions.length}</p>
                      <p className="text-sm text-muted-foreground">Discussions</p>
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Award className="w-5 h-5" />
                  Course Badges
                </h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Earn these badges by actively participating in the course:
                </p>
                <div className="grid gap-3">
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <MessageSquare className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium">First Discussion</p>
                      <p className="text-sm text-muted-foreground">
                        Post your first discussion in this course
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <ThumbsUp className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium">Helpful Answerer</p>
                      <p className="text-sm text-muted-foreground">
                        Provide 5 helpful answers (3+ upvotes each)
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <CheckCircle className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium">Problem Resolver</p>
                      <p className="text-sm text-muted-foreground">
                        Help resolve 3 questions marked as resolved
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <Award className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium">Active Contributor</p>
                      <p className="text-sm text-muted-foreground">
                        Create 10+ discussions and replies in this course
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Teacher AI Chat Modal */}
      <TeacherAIChat
        open={showTeacherAI}
        onOpenChange={setShowTeacherAI}
        teacherId={course.instructor.id}
        courseId={courseId}
        teacherName={`${course.instructor.firstName} ${course.instructor.lastName}`}
      />
    </div>
  );
}
