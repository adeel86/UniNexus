import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, Upload, Send, MessageSquare, BrainCircuit, GraduationCap } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { StudentPersonalTutorMaterial, StudentPersonalTutorSession, StudentPersonalTutorMessage } from "@shared/schema";

export function PersonalTutor() {
  const { userData: user } = useAuth();
  const { toast } = useToast();
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [mode, setMode] = useState("Explain");

  const { data: materials = [] } = useQuery<StudentPersonalTutorMaterial[]>({
    queryKey: ["/api/ai/personal-tutor/materials"],
  });

  const { data: sessions = [] } = useQuery<StudentPersonalTutorSession[]>({
    queryKey: ["/api/ai/personal-tutor/sessions"],
  });

  const { data: messages = [] } = useQuery<StudentPersonalTutorMessage[]>({
    queryKey: ["/api/ai/personal-tutor/sessions", activeSessionId, "messages"],
    enabled: !!activeSessionId,
  });

  const createSessionMutation = useMutation({
    mutationFn: async (title: string) => {
      const res = await apiRequest("POST", "/api/ai/personal-tutor/sessions", { title, mode });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai/personal-tutor/sessions"] });
      setActiveSessionId(data.id);
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      if (!activeSessionId) return;
      const res = await apiRequest("POST", "/api/ai/personal-tutor/chat", {
        sessionId: activeSessionId,
        message,
        mode,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai/personal-tutor/sessions", activeSessionId, "messages"] });
      setInput("");
    },
  });

  const handleSend = () => {
    if (!input.trim() || sendMessageMutation.isPending) return;
    
    if (!activeSessionId) {
      createSessionMutation.mutate(input.substring(0, 30) + "...", {
        onSuccess: (session) => {
          sendMessageMutation.mutate(input);
        }
      });
    } else {
      sendMessageMutation.mutate(input);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 h-[calc(100vh-200px)]">
      {/* Sidebar */}
      <div className="md:col-span-1 space-y-4">
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Materials
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button className="w-full justify-start gap-2 mb-4" variant="outline">
              <Upload className="h-4 w-4" />
              Upload Material
            </Button>
            <ScrollArea className="h-[200px]">
              {materials.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">No materials uploaded</p>
              ) : (
                materials.map((m) => (
                  <div key={m.id} className="text-sm p-2 hover:bg-accent rounded-md cursor-pointer mb-1 border">
                    {m.fileName}
                  </div>
                ))
              )}
            </ScrollArea>
            <div className="mt-6">
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Recent Chats
              </h3>
              <ScrollArea className="h-[200px]">
                {sessions.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => setActiveSessionId(s.id)}
                    className={`text-sm p-2 rounded-md cursor-pointer mb-1 border ${
                      activeSessionId === s.id ? "bg-primary text-primary-foreground" : "hover:bg-accent"
                    }`}
                  >
                    {s.title || "Untitled Chat"}
                  </div>
                ))}
              </ScrollArea>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Chat Area */}
      <div className="md:col-span-3 flex flex-col gap-4">
        <Card className="flex-1 flex flex-col overflow-hidden">
          <CardHeader className="border-b py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <BrainCircuit className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Personal AI Tutor</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Level: {user?.major || 'Academic'} Student
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                {["Explain", "Practice", "Quiz", "Revision"].map((m) => (
                  <Button
                    key={m}
                    size="sm"
                    variant={mode === m ? "default" : "outline"}
                    onClick={() => setMode(m)}
                    className="h-8"
                  >
                    {m}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 p-0 flex flex-col overflow-hidden">
            <ScrollArea className="flex-1 p-4">
              {messages.length === 0 && !activeSessionId ? (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-4 pt-12">
                  <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <GraduationCap className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Welcome back, {user?.firstName}!</h3>
                    <p className="text-sm text-muted-foreground max-w-sm">
                      I'm your personal tutor. I can help you with your {user?.major || 'studies'}. 
                      What would you like to learn today?
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 w-full max-w-md">
                    <Button variant="outline" size="sm" onClick={() => setInput("Explain polymorphism in Java")}>
                      Explain Polymorphism
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setInput("Test me on recursion")}>
                      Quiz on Recursion
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((m) => (
                    <div
                      key={m.id}
                      className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg p-3 ${
                          m.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted border"
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{m.content}</p>
                      </div>
                    </div>
                  ))}
                  {sendMessageMutation.isPending && (
                    <div className="flex justify-start">
                      <div className="bg-muted border rounded-lg p-3">
                        <div className="flex gap-1">
                          <div className="h-2 w-2 bg-foreground/30 rounded-full animate-bounce" />
                          <div className="h-2 w-2 bg-foreground/30 rounded-full animate-bounce delay-75" />
                          <div className="h-2 w-2 bg-foreground/30 rounded-full animate-bounce delay-150" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>
            <div className="p-4 border-t bg-background">
              <div className="flex gap-2">
                <Input
                  placeholder="Ask your tutor anything..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  className="flex-1"
                />
                <Button onClick={handleSend} disabled={sendMessageMutation.isPending || !input.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
