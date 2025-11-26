import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Bot, Send, GraduationCap, BookOpen, Sparkles, AlertCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface StudentAITutorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
  courseName: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  citations?: Array<{ contentId: string; title: string; chunkIndex: number }>;
}

interface ChatStatusResponse {
  courseId: string;
  courseName: string;
  instructorName: string;
  indexedChunks: number;
  isReady: boolean;
}

interface ChatResponse {
  sessionId: string;
  answer: string;
  citations: Array<{ contentId: string; title: string; chunkIndex: number }>;
}

export function StudentAITutor({ open, onOpenChange, courseId, courseName }: StudentAITutorProps) {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: status, isLoading: statusLoading } = useQuery<ChatStatusResponse>({
    queryKey: ["/api/ai/course-chat", courseId, "status"],
    enabled: open && !!courseId,
  });

  const chatMutation = useMutation({
    mutationFn: async (message: string): Promise<ChatResponse> => {
      const response = await apiRequest("POST", "/api/ai/course-chat", {
        courseId,
        message,
        sessionId,
      });
      return response as unknown as ChatResponse;
    },
    onSuccess: (data) => {
      setSessionId(data.sessionId);
      setMessages(prev => [
        ...prev,
        { 
          role: "assistant", 
          content: data.answer,
          citations: data.citations,
        }
      ]);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to get response",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (!open) {
      setMessages([]);
      setSessionId(null);
    }
  }, [open]);

  const handleSend = () => {
    if (!input.trim()) return;

    setMessages(prev => [...prev, { role: "user", content: input }]);
    chatMutation.mutate(input);
    setInput("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isReady = status?.isReady ?? false;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[600px] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-purple-600" />
            AI Course Tutor
            <span className="text-sm font-normal text-muted-foreground">- {courseName}</span>
          </DialogTitle>
          {status && (
            <div className="flex items-center gap-2 mt-2">
              <Badge variant={isReady ? "default" : "secondary"}>
                <BookOpen className="h-3 w-3 mr-1" />
                {status.indexedChunks} materials indexed
              </Badge>
              <span className="text-xs text-muted-foreground">
                Instructor: {status.instructorName}
              </span>
            </div>
          )}
        </DialogHeader>

        {statusLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="space-y-4 w-full max-w-sm">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
        ) : !isReady ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">
              No Course Materials Available
            </h3>
            <p className="text-muted-foreground max-w-md">
              Your instructor hasn't uploaded any materials for this course yet. 
              Check back later or ask your instructor to add content.
            </p>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 pr-4" ref={scrollRef}>
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-8">
                  <Sparkles className="h-12 w-12 text-purple-600 mb-4" />
                  <h3 className="font-semibold text-lg mb-2">
                    Ask Your AI Tutor
                  </h3>
                  <p className="text-muted-foreground max-w-md mb-4">
                    Get help understanding course concepts. The AI answers using 
                    only the materials your instructor has provided.
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    <Badge 
                      variant="outline" 
                      className="cursor-pointer"
                      onClick={() => setInput("What are the key topics covered in this course?")}
                      data-testid="button-suggestion-1"
                    >
                      Key topics?
                    </Badge>
                    <Badge 
                      variant="outline" 
                      className="cursor-pointer"
                      onClick={() => setInput("Can you explain the main concepts?")}
                      data-testid="button-suggestion-2"
                    >
                      Main concepts?
                    </Badge>
                    <Badge 
                      variant="outline" 
                      className="cursor-pointer"
                      onClick={() => setInput("What should I focus on for studying?")}
                      data-testid="button-suggestion-3"
                    >
                      Study tips?
                    </Badge>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 pb-4">
                  {messages.map((message, index) => (
                    <div
                      key={index}
                      className={`flex gap-3 ${
                        message.role === "assistant" ? "" : "flex-row-reverse"
                      }`}
                      data-testid={`message-${message.role}-${index}`}
                    >
                      <div
                        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                          message.role === "assistant"
                            ? "bg-purple-100 dark:bg-purple-900"
                            : "bg-blue-100 dark:bg-blue-900"
                        }`}
                      >
                        {message.role === "assistant" ? (
                          <Bot className="h-4 w-4 text-purple-600 dark:text-purple-300" />
                        ) : (
                          <span className="text-xs font-medium">You</span>
                        )}
                      </div>
                      <div className="flex-1 space-y-2">
                        <div
                          className={`p-3 rounded-lg ${
                            message.role === "assistant"
                              ? "bg-muted"
                              : "bg-primary text-primary-foreground"
                          }`}
                        >
                          <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                        </div>
                        {message.citations && message.citations.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {message.citations.map((cite, i) => (
                              <Badge 
                                key={i} 
                                variant="secondary" 
                                className="text-xs"
                                data-testid={`citation-${i}`}
                              >
                                <BookOpen className="h-3 w-3 mr-1" />
                                {cite.title}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {chatMutation.isPending && (
                    <div className="flex gap-3" data-testid="loading-indicator">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                        <Bot className="h-4 w-4 text-purple-600 dark:text-purple-300" />
                      </div>
                      <div className="flex-1 p-3 rounded-lg bg-muted">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" />
                          <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                          <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>

            <div className="flex gap-2 mt-4 flex-shrink-0">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask a question about the course..."
                rows={2}
                data-testid="textarea-chat-input"
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || chatMutation.isPending}
                size="icon"
                className="flex-shrink-0"
                data-testid="button-send-message"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
