import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/AuthContext";
import { UserAvatar } from "@/components/UserAvatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  HelpCircle, 
  MessageCircle, 
  ThumbsUp, 
  CheckCircle, 
  Clock, 
  Plus,
  ArrowUp,
  Award,
  Lightbulb
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface QuestionAuthor {
  id: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  profileImageUrl: string | null;
  rankTier: string | null;
}

interface Question {
  id: string;
  title: string;
  content: string;
  isQuestion: boolean;
  isResolved: boolean;
  replyCount: number;
  upvoteCount: number;
  createdAt: string;
  authorId: string;
  courseId: string;
  author: QuestionAuthor | null;
}

interface Answer {
  id: string;
  content: string;
  upvoteCount: number;
  createdAt: string;
  authorId: string;
  author: QuestionAuthor | null;
}

interface QuestionDetail extends Question {
  answers: Answer[];
  userHasUpvoted: boolean;
}

export default function ProblemSolving() {
  const { userData } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("all");
  const [showAskModal, setShowAskModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [newQuestionTitle, setNewQuestionTitle] = useState("");
  const [newQuestionContent, setNewQuestionContent] = useState("");
  const [newAnswerContent, setNewAnswerContent] = useState("");

  const { data: questions = [], isLoading: loadingQuestions } = useQuery<Question[]>({
    queryKey: ["/api/qa/questions", activeTab],
    queryFn: async () => {
      const params = activeTab === "resolved" 
        ? "?resolved=true" 
        : activeTab === "open" 
          ? "?resolved=false" 
          : "";
      const response = await fetch(`/api/qa/questions${params}`);
      if (!response.ok) throw new Error("Failed to fetch questions");
      return response.json();
    },
  });

  const { data: questionDetail, isLoading: loadingDetail } = useQuery<QuestionDetail>({
    queryKey: ["/api/qa/questions", selectedQuestionId],
    enabled: !!selectedQuestionId,
  });

  const askQuestionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/qa/questions", {
        title: newQuestionTitle,
        content: newQuestionContent,
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/qa/questions"] });
      setShowAskModal(false);
      setNewQuestionTitle("");
      setNewQuestionContent("");
      toast({
        title: "Question Posted!",
        description: "You earned +10 Problem-Solver Points for asking a question.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to post question",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const answerMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/qa/questions/${selectedQuestionId}/answers`, {
        content: newAnswerContent,
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/qa/questions", selectedQuestionId] });
      queryClient.invalidateQueries({ queryKey: ["/api/qa/questions"] });
      setNewAnswerContent("");
      toast({
        title: "Answer Posted!",
        description: "You earned +15 Problem-Solver Points for answering.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to post answer",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const upvoteMutation = useMutation({
    mutationFn: async ({ questionId, answerId }: { questionId?: string; answerId?: string }) => {
      const response = await apiRequest("POST", "/api/qa/upvote", { questionId, answerId });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/qa/questions", selectedQuestionId] });
      queryClient.invalidateQueries({ queryKey: ["/api/qa/questions"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to upvote",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const resolveMutation = useMutation({
    mutationFn: async (answerId: string) => {
      const response = await apiRequest("POST", `/api/qa/questions/${selectedQuestionId}/resolve`, {
        answerId,
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/qa/questions", selectedQuestionId] });
      queryClient.invalidateQueries({ queryKey: ["/api/qa/questions"] });
      setShowDetailModal(false);
      toast({
        title: "Question Resolved!",
        description: "The answer author earned +20 Problem-Solver Points.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to resolve",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const openQuestionDetail = (questionId: string) => {
    setSelectedQuestionId(questionId);
    setShowDetailModal(true);
  };

  if (loadingQuestions) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-3xl font-bold flex items-center gap-2">
            <Lightbulb className="h-8 w-8 text-primary" />
            Problem-Solving Q&A
          </h1>
          <p className="text-muted-foreground mt-1">
            Ask questions, share answers, and earn Problem-Solver Points
          </p>
        </div>
        <Button onClick={() => setShowAskModal(true)} data-testid="button-ask-question">
          <Plus className="h-4 w-4 mr-2" />
          Ask Question
        </Button>
      </div>

      <Card className="p-4 mb-6 bg-gradient-to-r from-purple-600/10 to-pink-600/10 border-purple-500/20">
        <div className="flex items-center gap-4">
          <Award className="h-10 w-10 text-primary" />
          <div>
            <h3 className="font-semibold">Earn Problem-Solver Points</h3>
            <p className="text-sm text-muted-foreground">
              Ask a question (+10 pts), Answer (+15 pts), Get upvotes (+2/+5 pts), Get accepted (+20 pts)
            </p>
          </div>
        </div>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList>
          <TabsTrigger value="all" data-testid="tab-all-questions">All Questions</TabsTrigger>
          <TabsTrigger value="open" data-testid="tab-open-questions">Open</TabsTrigger>
          <TabsTrigger value="resolved" data-testid="tab-resolved-questions">Resolved</TabsTrigger>
        </TabsList>
      </Tabs>

      {questions.length === 0 ? (
        <Card className="p-8 text-center">
          <HelpCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="font-semibold text-lg mb-2">No questions yet</h3>
          <p className="text-muted-foreground mb-4">
            Be the first to ask a question and earn Problem-Solver Points!
          </p>
          <Button onClick={() => setShowAskModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Ask the First Question
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {questions.map((question) => (
            <Card 
              key={question.id} 
              className="hover-elevate cursor-pointer transition-all"
              onClick={() => openQuestionDetail(question.id)}
              data-testid={`question-card-${question.id}`}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="flex flex-col items-center gap-1 min-w-[60px] text-center">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <ArrowUp className="h-4 w-4" />
                      <span className="font-semibold">{question.upvoteCount}</span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <MessageCircle className="h-4 w-4" />
                      <span>{question.replyCount}</span>
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {question.isResolved ? (
                        <Badge className="bg-green-500/10 text-green-600 dark:text-green-400">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Resolved
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-orange-600 dark:text-orange-400">
                          <Clock className="h-3 w-3 mr-1" />
                          Open
                        </Badge>
                      )}
                    </div>
                    
                    <h3 className="font-semibold text-lg mt-2 hover:text-primary transition-colors">
                      {question.title}
                    </h3>
                    
                    <p className="text-muted-foreground text-sm line-clamp-2 mt-1">
                      {question.content}
                    </p>
                    
                    <div className="flex items-center gap-2 mt-3">
                      {question.author && (
                        <>
                          <UserAvatar user={question.author} size="sm" />
                          <span className="text-sm text-muted-foreground">
                            {question.author.displayName || `${question.author.firstName} ${question.author.lastName}`}
                          </span>
                        </>
                      )}
                      <span className="text-sm text-muted-foreground">
                        asked {formatDistanceToNow(new Date(question.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showAskModal} onOpenChange={setShowAskModal}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-primary" />
              Ask a Question
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="question-title">Question Title</Label>
              <Input
                id="question-title"
                placeholder="What's your question about?"
                value={newQuestionTitle}
                onChange={(e) => setNewQuestionTitle(e.target.value)}
                className="mt-2"
                data-testid="input-question-title"
              />
            </div>
            
            <div>
              <Label htmlFor="question-content">Details</Label>
              <Textarea
                id="question-content"
                placeholder="Describe your question in detail..."
                value={newQuestionContent}
                onChange={(e) => setNewQuestionContent(e.target.value)}
                className="min-h-[150px] mt-2"
                data-testid="textarea-question-content"
              />
            </div>
            
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setShowAskModal(false)}>
                Cancel
              </Button>
              <Button 
                onClick={() => askQuestionMutation.mutate()}
                disabled={!newQuestionTitle.trim() || !newQuestionContent.trim() || askQuestionMutation.isPending}
                data-testid="button-submit-question"
              >
                {askQuestionMutation.isPending ? "Posting..." : "Post Question (+10 pts)"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
          {loadingDetail ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : questionDetail ? (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-2">
                  {questionDetail.isResolved ? (
                    <Badge className="bg-green-500/10 text-green-600 dark:text-green-400">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Resolved
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-orange-600 dark:text-orange-400">
                      <Clock className="h-3 w-3 mr-1" />
                      Open
                    </Badge>
                  )}
                </div>
                <DialogTitle className="font-heading text-xl">
                  {questionDetail.title}
                </DialogTitle>
              </DialogHeader>
              
              <div className="mt-4">
                <div className="flex items-start gap-4">
                  <div className="flex flex-col items-center gap-1">
                    <Button
                      size="icon"
                      variant={questionDetail.userHasUpvoted ? "default" : "outline"}
                      onClick={() => upvoteMutation.mutate({ questionId: questionDetail.id })}
                      data-testid="button-upvote-question"
                    >
                      <ThumbsUp className="h-4 w-4" />
                    </Button>
                    <span className="font-semibold">{questionDetail.upvoteCount}</span>
                  </div>
                  
                  <div className="flex-1">
                    <p className="whitespace-pre-wrap">{questionDetail.content}</p>
                    
                    <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                      {questionDetail.author && (
                        <>
                          <UserAvatar user={questionDetail.author} size="sm" />
                          <span className="text-sm">
                            {questionDetail.author.displayName || `${questionDetail.author.firstName} ${questionDetail.author.lastName}`}
                          </span>
                        </>
                      )}
                      <span className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(questionDetail.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t">
                  <h4 className="font-semibold flex items-center gap-2 mb-4">
                    <MessageCircle className="h-4 w-4" />
                    {questionDetail.answers.length} Answer{questionDetail.answers.length !== 1 ? 's' : ''}
                  </h4>
                  
                  {questionDetail.answers.length === 0 ? (
                    <p className="text-muted-foreground text-sm py-4">
                      No answers yet. Be the first to answer!
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {questionDetail.answers.map((answer) => (
                        <div key={answer.id} className="flex items-start gap-4 p-4 rounded-lg bg-muted/50">
                          <div className="flex flex-col items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              onClick={() => upvoteMutation.mutate({ answerId: answer.id })}
                              data-testid={`button-upvote-answer-${answer.id}`}
                            >
                              <ThumbsUp className="h-3 w-3" />
                            </Button>
                            <span className="text-sm font-semibold">{answer.upvoteCount}</span>
                            
                            {!questionDetail.isResolved && questionDetail.authorId === userData?.id && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 text-green-600 hover:text-green-700 mt-2"
                                onClick={() => resolveMutation.mutate(answer.id)}
                                title="Accept this answer"
                                data-testid={`button-accept-answer-${answer.id}`}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                          
                          <div className="flex-1">
                            <p className="whitespace-pre-wrap">{answer.content}</p>
                            
                            <div className="flex items-center gap-2 mt-3">
                              {answer.author && (
                                <>
                                  <UserAvatar user={answer.author} size="sm" />
                                  <span className="text-sm">
                                    {answer.author.displayName || `${answer.author.firstName} ${answer.author.lastName}`}
                                  </span>
                                </>
                              )}
                              <span className="text-sm text-muted-foreground">
                                {formatDistanceToNow(new Date(answer.createdAt), { addSuffix: true })}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {!questionDetail.isResolved && (
                    <div className="mt-6 pt-4 border-t">
                      <Label htmlFor="new-answer">Your Answer</Label>
                      <Textarea
                        id="new-answer"
                        placeholder="Share your knowledge..."
                        value={newAnswerContent}
                        onChange={(e) => setNewAnswerContent(e.target.value)}
                        className="min-h-[100px] mt-2"
                        data-testid="textarea-new-answer"
                      />
                      <Button
                        className="mt-3"
                        onClick={() => answerMutation.mutate()}
                        disabled={!newAnswerContent.trim() || answerMutation.isPending}
                        data-testid="button-submit-answer"
                      >
                        {answerMutation.isPending ? "Posting..." : "Post Answer (+15 pts)"}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
