import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Bot,
  Send,
  GraduationCap,
  BookOpen,
  Paperclip,
  FileText,
  ArrowLeft,
} from "lucide-react";
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
  createdAt?: string;
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

function isFileMessage(content: string) {
  return content.startsWith("📎 Uploaded:");
}

function FileMessageCard({ fileName }: { fileName: string }) {
  return (
    <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-xl px-4 py-3 max-w-[240px]">
      <FileText className="h-5 w-5 text-primary flex-shrink-0" />
      <span className="text-sm font-medium truncate">{fileName}</span>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center">
        <Bot className="h-4 w-4 text-purple-600 dark:text-purple-400" />
      </div>
      <div className="bg-muted/70 border border-border/50 rounded-2xl rounded-tl-sm px-4 py-3">
        <div className="flex gap-1 items-center h-4">
          <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:0ms]" />
          <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:150ms]" />
          <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}

export function StudentAITutor({ open, onOpenChange, courseId, courseName }: StudentAITutorProps) {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: status, isLoading: statusLoading } = useQuery<ChatStatusResponse>({
    queryKey: ["/api/ai/course-chat", courseId, "status"],
    enabled: open && !!courseId,
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isUploading]);

  // Auto-load existing session when dialog opens
  useEffect(() => {
    if (open && courseId) {
      loadExistingSession();
    } else if (!open) {
      setMessages([]);
      setSessionId(null);
      setInput("");
    }
  }, [open, courseId]);

  const loadExistingSession = async () => {
    setIsLoadingHistory(true);
    try {
      const res = await apiRequest("GET", `/api/ai/course-chat/${courseId}/sessions`);
      const sessions = await res.json();
      if (sessions.length > 0) {
        const latestSession = sessions[0];
        setSessionId(latestSession.id);
        const msgRes = await apiRequest("GET", `/api/ai/course-chat/session/${latestSession.id}`);
        const msgs = await msgRes.json();
        setMessages(
          msgs.map((m: any) => ({
            role: m.role,
            content: m.content,
            createdAt: m.createdAt,
          }))
        );
      }
    } catch {
      // No existing session — that's fine, a new one will be created on first message
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const chatMutation = useMutation({
    mutationFn: async (message: string): Promise<ChatResponse> => {
      const response = await apiRequest("POST", "/api/ai/course-chat", {
        courseId,
        message,
        sessionId,
      });
      return await response.json();
    },
    onSuccess: (data) => {
      setSessionId(data.sessionId);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.answer, citations: data.citations },
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

  const handleSend = () => {
    const text = input.trim();
    if (!text || chatMutation.isPending) return;
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    chatMutation.mutate(text);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    if (!sessionId) {
      toast({ title: "Send a message first before attaching a file.", variant: "destructive" });
      return;
    }
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("sessionId", sessionId);
      const res = await apiRequest("POST", "/api/ai/course-chat/upload", formData);
      if (!res.ok) throw new Error("Upload failed");
      const fileMessage = `📎 Uploaded: ${file.name}`;
      setMessages((prev) => [...prev, { role: "user", content: fileMessage }]);
      chatMutation.mutate(fileMessage);
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const isReady = status?.isReady ?? false;
  const isBusy = chatMutation.isPending || isUploading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`flex flex-col p-0 gap-0 overflow-hidden ${
          isMobile
            ? "w-full h-full max-w-full max-h-full m-0 rounded-none"
            : "max-w-2xl h-[680px]"
        }`}
      >
        <input
          type="file"
          className="hidden"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".pdf,.doc,.docx,.txt"
        />

        {/* Header */}
        <DialogHeader className="flex-shrink-0 px-3 sm:px-4 py-3 border-b">
          <div className="flex items-center gap-2 pr-8">
            {/* Mobile back button */}
            {isMobile && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 -ml-1 flex-shrink-0"
                onClick={() => onOpenChange(false)}
                data-testid="button-back-mobile"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}

            <GraduationCap className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600 flex-shrink-0" />

            <DialogTitle className="flex-1 min-w-0 text-sm sm:text-base truncate">
              AI Tutor
              <span className="hidden sm:inline text-sm font-normal text-muted-foreground ml-1">
                — {courseName}
              </span>
            </DialogTitle>

            {status && (
              <Badge
                variant={isReady ? "default" : "outline"}
                className="text-xs flex-shrink-0"
                data-testid="badge-materials-count"
              >
                <BookOpen className="h-3 w-3 mr-1" />
                <span>{status.indexedChunks} {status.indexedChunks === 1 ? "material" : "materials"}</span>
              </Badge>
            )}
          </div>
        </DialogHeader>

        {statusLoading || isLoadingHistory ? (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="space-y-3 w-full max-w-xs">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
        ) : (
          <div className="flex flex-1 min-h-0">
            {/* Chat Area */}
            <div className="flex-1 flex flex-col min-h-0">
              <ScrollArea className="flex-1 px-3 sm:px-4 py-4">
                <div className="space-y-4">
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                      {!isReady && (
                        <div className="mb-4 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-2 max-w-xs">
                          No materials indexed yet — the AI will answer from general knowledge.
                        </div>
                      )}
                      <Bot className="h-12 w-12 text-purple-400 mb-3" />
                      <h3 className="font-semibold mb-1 text-base">Ask your AI Tutor</h3>
                      <p className="text-sm text-muted-foreground max-w-xs mb-4">
                        Questions are answered using your instructor's materials. You can also upload your own documents.
                      </p>
                      <div className="flex flex-wrap justify-center gap-2">
                        {["What are the key topics?", "Explain the main concepts", "What should I study?"].map((s) => (
                          <button
                            key={s}
                            onClick={() => setInput(s)}
                            className="text-xs px-3 py-1.5 border rounded-full hover:bg-muted transition-colors"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    messages.map((message, index) => {
                      const isUser = message.role === "user";
                      const isFile = isFileMessage(message.content);
                      const fileName = isFile ? message.content.replace("📎 Uploaded: ", "") : null;

                      return (
                        <div
                          key={index}
                          className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}
                          data-testid={`message-${message.role}-${index}`}
                        >
                          {!isUser && (
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center mt-1">
                              <Bot className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                            </div>
                          )}
                          <div className={`max-w-[80%] sm:max-w-[72%] flex flex-col ${isUser ? "items-end" : "items-start"}`}>
                            {isFile && fileName ? (
                              <FileMessageCard fileName={fileName} />
                            ) : (
                              <div
                                className={`px-4 py-3 rounded-2xl text-sm whitespace-pre-wrap leading-relaxed ${
                                  isUser
                                    ? "bg-primary text-primary-foreground rounded-tr-sm"
                                    : "bg-muted/70 border border-border/50 rounded-tl-sm"
                                }`}
                              >
                                {message.content}
                              </div>
                            )}
                            {message.citations && message.citations.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {message.citations.map((cite, i) => (
                                  <Badge
                                    key={i}
                                    variant="secondary"
                                    className="text-[10px] px-2 py-0"
                                    data-testid={`citation-${i}`}
                                  >
                                    <BookOpen className="h-2.5 w-2.5 mr-1" />
                                    {cite.title}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                  {isBusy && <TypingIndicator />}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Input Bar */}
              <div className="flex-shrink-0 border-t bg-background px-3 sm:px-4 py-3">
                <div className="flex items-end gap-2 bg-muted/40 border rounded-2xl px-3 py-2 focus-within:border-primary/50 transition-colors">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isBusy || !sessionId}
                          className="flex-shrink-0 p-1.5 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
                          data-testid="button-attach-file"
                        >
                          <Paperclip className="h-5 w-5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {sessionId ? "Attach PDF, DOC, or TXT" : "Send a message first to attach files"}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <Textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={isUploading ? "Uploading..." : "Ask a question about the course..."}
                    disabled={isBusy}
                    rows={1}
                    className="flex-1 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0 min-h-[36px] max-h-28 py-1.5 px-0 text-sm"
                    data-testid="textarea-chat-input"
                  />

                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || isBusy}
                    className="flex-shrink-0 p-1.5 bg-primary text-primary-foreground rounded-xl disabled:opacity-40 hover:bg-primary/90 transition-colors"
                    data-testid="button-send-message"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
