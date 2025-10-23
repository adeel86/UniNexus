import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sparkles, Send, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function AIAssistant() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hi! I'm UniNexus AI, your personal career and academic mentor. How can I help you today?"
    }
  ]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const chatMutation = useMutation({
    mutationFn: async (userMessage: string) => {
      const chatMessages = [
        ...messages.map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: userMessage }
      ];
      
      const res = await apiRequest('POST', '/api/ai/chat', { messages: chatMessages });
      return await res.json();
    },
    onSuccess: (data) => {
      setMessages(prev => [...prev, { role: 'assistant', content: data.message }]);
    },
    onError: (error: Error) => {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `I'm sorry, I encountered an error: ${error.message}. Please try again.` 
      }]);
    },
  });

  const handleSend = () => {
    if (!input.trim() || chatMutation.isPending) return;

    const userMessage = input.trim();
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setInput("");
    chatMutation.mutate(userMessage);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="h-[calc(100vh-4rem)] max-w-4xl mx-auto px-4 pt-20 pb-24 md:pb-8 flex flex-col">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-chart-2 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-bold">AI Assistant</h1>
            <p className="text-sm text-muted-foreground">Your personal career mentor</p>
          </div>
        </div>
      </div>

      <Card className="flex-1 flex flex-col rounded-2xl overflow-hidden">
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                data-testid={`message-${message.role}-${index}`}
              >
                {message.role === 'assistant' && (
                  <Avatar className="h-8 w-8 ring-2 ring-primary/10">
                    <AvatarFallback className="bg-gradient-to-br from-primary to-chart-2 text-white text-xs">
                      AI
                    </AvatarFallback>
                  </Avatar>
                )}
                
                <div
                  className={`rounded-2xl px-4 py-2 max-w-[80%] ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                </div>

                {message.role === 'user' && user && (
                  <Avatar className="h-8 w-8 ring-2 ring-primary/10">
                    <AvatarImage src={user.photoURL || ""} />
                    <AvatarFallback className="bg-gradient-to-br from-chart-1 to-chart-3 text-white text-xs">
                      {user.displayName?.split(' ').map(n => n[0]).join('') || 'U'}
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}

            {chatMutation.isPending && (
              <div className="flex gap-3 justify-start">
                <Avatar className="h-8 w-8 ring-2 ring-primary/10">
                  <AvatarFallback className="bg-gradient-to-br from-primary to-chart-2 text-white text-xs">
                    AI
                  </AvatarFallback>
                </Avatar>
                <div className="rounded-2xl px-4 py-2 bg-muted">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Input
              placeholder="Ask me anything about your career or studies..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              className="rounded-full"
              data-testid="input-chat-message"
              disabled={chatMutation.isPending}
            />
            <Button
              size="icon"
              className="rounded-full"
              onClick={handleSend}
              disabled={!input.trim() || chatMutation.isPending}
              data-testid="button-send-message"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
        {[
          "Help me improve my CV",
          "What skills should I learn?",
          "Find me internships",
          "Career path advice"
        ].map((suggestion, index) => (
          <Button
            key={index}
            variant="outline"
            size="sm"
            className="rounded-full text-xs"
            onClick={() => {
              setInput(suggestion);
              setTimeout(() => handleSend(), 100);
            }}
            disabled={chatMutation.isPending}
            data-testid={`button-suggestion-${index}`}
          >
            {suggestion}
          </Button>
        ))}
      </div>
    </div>
  );
}
