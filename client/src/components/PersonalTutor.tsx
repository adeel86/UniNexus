import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
import {
  Send,
  Paperclip,
  Plus,
  Trash2,
  BrainCircuit,
  FileText,
  ChevronDown,
  MessageSquare,
  Menu,
  Pencil,
  Check,
  X,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { StudentPersonalTutorSession, StudentPersonalTutorMessage } from "@shared/schema";

const MODES = ["Explain", "Practice", "Quiz", "Revision"] as const;
type Mode = typeof MODES[number];

function isFileMessage(content: string) {
  return content.startsWith("📎 Uploaded:");
}

function FileMessageCard({ fileName }: { fileName: string }) {
  return (
    <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-xl px-4 py-3 max-w-xs">
      <FileText className="h-5 w-5 text-primary flex-shrink-0" />
      <span className="text-sm font-medium truncate">{fileName}</span>
    </div>
  );
}

function MessageBubble({ message }: { message: StudentPersonalTutorMessage }) {
  const isUser = message.role === "user";
  const isFile = isFileMessage(message.content);
  const fileName = isFile ? message.content.replace("📎 Uploaded: ", "") : null;

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center mt-1">
          <BrainCircuit className="h-4 w-4 text-purple-600 dark:text-purple-400" />
        </div>
      )}
      <div className={`max-w-[80%] flex flex-col ${isUser ? "items-end" : "items-start"}`}>
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
        <span className="text-[11px] text-muted-foreground mt-1 px-1">
          {message.createdAt
            ? new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            : ""}
        </span>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center">
        <BrainCircuit className="h-4 w-4 text-purple-600 dark:text-purple-400" />
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

interface SessionListProps {
  sessions: StudentPersonalTutorSession[];
  activeSessionId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, newTitle: string) => void;
  onNewChat: () => void;
}

function SessionList({ sessions, activeSessionId, onSelect, onDelete, onRename, onNewChat }: SessionListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const startEdit = (e: React.MouseEvent, session: StudentPersonalTutorSession) => {
    e.stopPropagation();
    setEditingId(session.id);
    setEditValue(session.title || "Untitled Chat");
  };

  const commitEdit = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (editValue.trim()) {
      onRename(id, editValue.trim());
    }
    setEditingId(null);
  };

  const cancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b">
        <Button
          onClick={onNewChat}
          variant="outline"
          size="sm"
          className="w-full gap-2 justify-start"
          data-testid="button-new-chat"
        >
          <Plus className="h-4 w-4" />
          New Chat
        </Button>
      </div>
      <ScrollArea className="flex-1 px-2 py-2">
        {sessions.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8 px-2">
            No chats yet. Start one!
          </p>
        ) : (
          <div className="space-y-1">
            {sessions.map((s) => (
              <div
                key={s.id}
                className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm transition-colors ${
                  activeSessionId === s.id
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-muted"
                }`}
                onClick={() => editingId !== s.id && onSelect(s.id)}
                data-testid={`session-item-${s.id}`}
              >
                <MessageSquare className="h-3.5 w-3.5 flex-shrink-0 opacity-60" />

                {editingId === s.id ? (
                  <div className="flex-1 flex items-center gap-1 min-w-0" onClick={(e) => e.stopPropagation()}>
                    <Input
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitEdit(e as any, s.id);
                        if (e.key === "Escape") cancelEdit(e as any);
                      }}
                      className="h-6 text-xs px-1 py-0 border-primary/40"
                      autoFocus
                      data-testid={`input-rename-session-${s.id}`}
                    />
                    <button
                      onClick={(e) => commitEdit(e, s.id)}
                      className="flex-shrink-0 text-primary hover:text-primary/80"
                      data-testid={`button-confirm-rename-${s.id}`}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="flex-shrink-0 text-muted-foreground hover:text-foreground"
                      data-testid={`button-cancel-rename-${s.id}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="flex-1 truncate text-xs leading-snug">
                      {s.title || "Untitled Chat"}
                    </span>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <button
                        onClick={(e) => startEdit(e, s)}
                        className="text-muted-foreground hover:text-foreground p-0.5"
                        data-testid={`button-rename-session-${s.id}`}
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(s.id);
                        }}
                        className="text-muted-foreground hover:text-destructive p-0.5"
                        data-testid={`button-delete-session-${s.id}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

function generateSessionTitle(message: string): string {
  const cleaned = message.replace(/^📎 Uploaded:\s*/i, "").trim();
  return cleaned.length > 60 ? cleaned.substring(0, 57) + "..." : cleaned;
}

export function PersonalTutor() {
  const { userData: user } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<Mode>("Explain");
  const [isUploading, setIsUploading] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: sessions = [] } = useQuery<StudentPersonalTutorSession[]>({
    queryKey: ["/api/ai/personal-tutor/sessions"],
  });

  const { data: messages = [] } = useQuery<StudentPersonalTutorMessage[]>({
    queryKey: ["/api/ai/personal-tutor/sessions", activeSessionId, "messages"],
    enabled: !!activeSessionId,
    staleTime: 0,
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isUploading]);

  const createSessionMutation = useMutation({
    mutationFn: async (title: string) => {
      const res = await apiRequest("POST", "/api/ai/personal-tutor/sessions", { title, mode });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai/personal-tutor/sessions"] });
      setActiveSessionId(data.id);
      return data;
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (params: { message: string; sessionId: string }) => {
      const res = await apiRequest("POST", "/api/ai/personal-tutor/chat", {
        sessionId: params.sessionId,
        message: params.message,
        mode,
      });
      return res.json();
    },
    onSuccess: (msgs: StudentPersonalTutorMessage[], variables) => {
      queryClient.setQueryData(
        ["/api/ai/personal-tutor/sessions", variables.sessionId, "messages"],
        msgs
      );
      queryClient.invalidateQueries({ queryKey: ["/api/ai/personal-tutor/sessions"] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to send message", variant: "destructive" });
    },
  });

  const deleteSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const res = await apiRequest("DELETE", `/api/ai/personal-tutor/sessions/${sessionId}`);
      return res.json();
    },
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai/personal-tutor/sessions"] });
      if (activeSessionId === deletedId) {
        setActiveSessionId(null);
      }
      toast({ title: "Chat deleted" });
    },
  });

  const renameSessionMutation = useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => {
      const res = await apiRequest("PATCH", `/api/ai/personal-tutor/sessions/${id}`, { title });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai/personal-tutor/sessions"] });
    },
  });

  const ensureSession = async (firstMessage: string): Promise<string> => {
    if (activeSessionId) return activeSessionId;
    const title = generateSessionTitle(firstMessage);
    const session = await createSessionMutation.mutateAsync(title);
    return session.id;
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sendMessageMutation.isPending) return;
    setInput("");
    try {
      const sid = await ensureSession(text);
      sendMessageMutation.mutate({ message: text, sessionId: sid });
    } catch {
      toast({ title: "Could not start session", variant: "destructive" });
    }
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
    setIsUploading(true);
    try {
      const sid = await ensureSession(`📎 Uploaded: ${file.name}`);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("sessionId", sid);
      const uploadRes = await apiRequest("POST", "/api/ai/personal-tutor/materials", formData);
      if (!uploadRes.ok) throw new Error("Upload failed");
      sendMessageMutation.mutate({ message: `📎 Uploaded: ${file.name}`, sessionId: sid });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleNewChat = () => {
    setActiveSessionId(null);
    setInput("");
    setMobileMenuOpen(false);
  };

  const handleSelectSession = (id: string) => {
    setActiveSessionId(id);
    setMobileMenuOpen(false);
  };

  const handleDeleteRequest = (id: string) => {
    setDeleteTargetId(id);
  };

  const handleConfirmDelete = () => {
    if (deleteTargetId) {
      deleteSessionMutation.mutate(deleteTargetId);
    }
    setDeleteTargetId(null);
  };

  const handleRename = (id: string, newTitle: string) => {
    renameSessionMutation.mutate({ id, title: newTitle });
  };

  const isBusy = sendMessageMutation.isPending || isUploading;

  const sessionListProps: SessionListProps = {
    sessions,
    activeSessionId,
    onSelect: handleSelectSession,
    onDelete: handleDeleteRequest,
    onRename: handleRename,
    onNewChat: handleNewChat,
  };

  return (
    <div className="flex h-full min-h-0 bg-background">
      <input
        type="file"
        className="hidden"
        onChange={handleFileChange}
        ref={fileInputRef}
        accept=".pdf,.doc,.docx,.txt"
      />

      {/* Confirmation Dialog */}
      <AlertDialog open={!!deleteTargetId} onOpenChange={(open) => !open && setDeleteTargetId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this chat?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the chat and all uploaded files associated with it. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Yes, Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Desktop Sidebar */}
      {!isMobile && (
        <div className="w-60 flex-shrink-0 border-r flex flex-col bg-muted/20">
          <SessionList {...sessionListProps} />
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-3 sm:px-4 py-3 border-b bg-background">
          <div className="flex items-center gap-2">
            {/* Mobile menu trigger */}
            {isMobile && (
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" data-testid="button-mobile-menu">
                    <Menu className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-72 p-0 flex flex-col">
                  <SheetHeader className="p-4 border-b">
                    <SheetTitle className="text-left text-sm">Chat History</SheetTitle>
                  </SheetHeader>
                  <div className="flex-1 min-h-0">
                    <SessionList {...sessionListProps} />
                  </div>
                </SheetContent>
              </Sheet>
            )}

            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <BrainCircuit className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <h2 className="font-semibold text-sm leading-tight">Personal AI Tutor</h2>
                {!isMobile && (
                  <p className="text-xs text-muted-foreground">
                    {"Academic"} · {"University"}
                  </p>
                )}
              </div>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs" data-testid="dropdown-mode">
                {mode}
                <ChevronDown className="h-3.5 w-3.5 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {MODES.map((m) => (
                <DropdownMenuItem
                  key={m}
                  onClick={() => setMode(m)}
                  className={mode === m ? "bg-muted font-medium" : ""}
                  data-testid={`mode-option-${m}`}
                >
                  {m}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 px-3 sm:px-4 py-4">
          <div className="max-w-3xl mx-auto space-y-4">
            {messages.length === 0 && !activeSessionId ? (
              <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                <div className="w-14 h-14 bg-purple-100 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center mb-4">
                  <BrainCircuit className="h-7 w-7 text-purple-600" />
                </div>
                <h3 className="font-semibold text-base mb-1">
                  Hi {user?.firstName || "there"}, I'm your AI Tutor!
                </h3>
                <p className="text-sm text-muted-foreground max-w-xs mb-5">
                  Ask me anything or upload a document and I'll answer questions based on it.
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {[
                    "Explain Big O notation",
                    "Quiz me on recursion",
                    "Summarise my notes",
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => setInput(suggestion)}
                      className="px-3 py-1.5 text-xs border rounded-full hover:bg-muted transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : messages.length === 0 && activeSessionId ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <p className="text-sm text-muted-foreground">Send a message or upload a document to begin.</p>
              </div>
            ) : (
              messages.map((m) => <MessageBubble key={m.id} message={m} />)
            )}

            {isBusy && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input Bar */}
        <div className="flex-shrink-0 border-t bg-background px-3 sm:px-4 py-3">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-end gap-2 bg-muted/40 border rounded-2xl px-3 py-2 focus-within:border-primary/50 transition-colors">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isBusy}
                      className="flex-shrink-0 p-1.5 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
                      data-testid="button-attach-file"
                    >
                      <Paperclip className="h-5 w-5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Attach PDF, DOC, or TXT</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isUploading ? "Uploading document..." : "Ask your tutor anything..."}
                disabled={isBusy}
                rows={1}
                className="flex-1 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0 min-h-[36px] max-h-32 py-1.5 px-0 text-sm"
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
            <p className="text-[10px] text-muted-foreground text-center mt-2">
              AI may make mistakes. Verify important information.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
