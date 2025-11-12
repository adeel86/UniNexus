import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, Send, X, Sparkles } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

// Role-specific assistant configuration
const getRoleConfig = (role: string, firstName: string) => {
  const configs: Record<string, { title: string; greeting: string }> = {
    student: {
      title: 'AI CareerBot',
      greeting: `Hi ${firstName}! 👋 I'm your AI CareerBot. I can help you with:\n\n• Career advice and guidance\n• Skill gap analysis\n• Resume tips\n• Interview preparation\n• Learning path recommendations\n\nWhat would you like to know?`
    },
    teacher: {
      title: 'AI Teaching Assistant',
      greeting: `Hi ${firstName}! 👋 I'm your AI Teaching Assistant. I can help you with:\n\n• Course content ideas\n• Teaching strategies\n• Student engagement tips\n• Assessment design\n• Professional development\n\nHow can I assist you today?`
    },
    university_admin: {
      title: 'AI Admin Assistant',
      greeting: `Hi ${firstName}! 👋 I'm your AI Admin Assistant. I can help you with:\n\n• University management insights\n• Student engagement analytics\n• Program development ideas\n• Policy recommendations\n• Strategic planning\n\nWhat would you like to discuss?`
    },
    industry_professional: {
      title: 'AI Industry Advisor',
      greeting: `Hi ${firstName}! 👋 I'm your AI Industry Advisor. I can help you with:\n\n• Talent acquisition strategies\n• Industry trends and insights\n• Collaboration opportunities\n• Mentorship guidance\n• Professional networking\n\nHow can I help you?`
    },
    master_admin: {
      title: 'AI Platform Assistant',
      greeting: `Hi ${firstName}! 👋 I'm your AI Platform Assistant. I can help you with:\n\n• Platform analytics\n• User engagement strategies\n• Content moderation insights\n• System optimization\n• Strategic recommendations\n\nWhat would you like to explore?`
    }
  };
  
  return configs[role] || configs.student;
};

export function CareerBot() {
  const { userData } = useAuth();
  const roleConfig = getRoleConfig(userData?.role || 'student', userData?.firstName || 'there');
  
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: roleConfig.greeting
    }
  ]);
  const [input, setInput] = useState("");

  const chatMutation = useMutation({
    mutationFn: async (userMessage: string) => {
      const response = await apiRequest("POST", "/api/careerbot/chat", { message: userMessage });
      return await response.json() as { message: string };
    },
    onSuccess: (data) => {
      setMessages(prev => [...prev, { role: 'assistant', content: data.message }]);
    },
  });

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setInput("");
    chatMutation.mutate(userMessage);
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 p-0 z-50"
        data-testid="button-open-careerbot"
      >
        <MessageCircle className="h-6 w-6" />
        <div className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full animate-pulse" />
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-6 right-6 w-96 h-[600px] shadow-2xl z-50 flex flex-col">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-t-lg flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          <span className="font-heading font-semibold">{roleConfig.title}</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsOpen(false)}
          className="text-white hover:bg-white/20"
          data-testid="button-close-careerbot"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/20">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`
                max-w-[80%] rounded-lg p-3
                ${message.role === 'user'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                  : 'bg-white dark:bg-gray-800 border'
                }
              `}
              data-testid={`message-${index}`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            </div>
          </div>
        ))}
        {chatMutation.isPending && (
          <div className="flex justify-start">
            <div className="bg-white dark:bg-gray-800 border rounded-lg p-3">
              <div className="flex gap-1">
                <div className="h-2 w-2 rounded-full bg-purple-600 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="h-2 w-2 rounded-full bg-purple-600 animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="h-2 w-2 rounded-full bg-purple-600 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask me anything about your career..."
            className="resize-none min-h-[60px]"
            data-testid="input-careerbot-message"
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || chatMutation.isPending}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            data-testid="button-send-message"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
