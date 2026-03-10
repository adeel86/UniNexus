import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { ArrowLeft, Send, Sparkles } from "lucide-react";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

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

export default function CareerBotPage() {
  const { userData: user } = useAuth();
  const [, navigate] = useLocation();
  
  const roleConfig = getRoleConfig(user?.role || 'student', user?.firstName || 'there');

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

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/95">
      {/* Mobile Header */}
      <div className="bg-gradient-to-r from-yellow-500 to-amber-600 text-white p-4 sticky top-0 z-10 md:hidden">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="p-2 hover:bg-white/20 rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">AI Career Bot</h1>
            <p className="text-sm text-yellow-100">Career guidance & advice</p>
          </div>
        </div>
      </div>

      {/* Desktop Header */}
      <div className="hidden md:block bg-gradient-to-r from-yellow-500 to-amber-600 text-white p-6">
        <h1 className="text-3xl font-bold">AI Career Bot</h1>
        <p className="text-yellow-100 mt-2">Get personalized career guidance and advice</p>
      </div>

      {/* Chat Container */}
      <div className="max-w-4xl mx-auto p-4">
        <Card className="h-[600px] shadow-lg flex flex-col overflow-hidden">
          {/* Chat Messages */}
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
                      ? 'bg-gradient-to-r from-yellow-500 to-amber-600 text-white'
                      : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
                    }
                  `}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            ))}
            {chatMutation.isPending && (
              <div className="flex justify-start">
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                  <div className="flex gap-1">
                    <div className="h-2 w-2 rounded-full bg-yellow-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="h-2 w-2 rounded-full bg-yellow-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="h-2 w-2 rounded-full bg-yellow-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="p-4 border-t bg-white dark:bg-gray-900">
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
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || chatMutation.isPending}
                className="bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700 h-auto"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
