import { ChatBubble } from "@/components/ChatBubble";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

export default function AIChat() {
  const [message, setMessage] = useState("");
  //todo: remove mock functionality
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([
    { role: "assistant", content: "Hi! I'm your UniNexus AI assistant. I can help you with course questions, study tips, and connect you with relevant resources. What would you like to know?" }
  ]);

  const suggestedPrompts = [
    "Explain recursion in simple terms",
    "Best resources for learning React",
    "How to prepare for coding interviews",
    "Study tips for exams"
  ];

  const handleSend = () => {
    if (!message.trim()) return;
    
    setMessages([...messages, 
      { role: "user", content: message },
      { role: "assistant", content: "I understand you're asking about " + message + ". Let me help you with that..." }
    ]);
    setMessage("");
  };

  return (
    <div className="max-w-4xl mx-auto px-4 pt-20 pb-24 md:pb-8">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-6 w-6 text-primary" />
          <h1 className="text-4xl font-display font-bold">AI Assistant</h1>
        </div>
        <p className="text-muted-foreground">Ask questions, get instant answers</p>
      </div>

      <Card className="rounded-2xl p-6 mb-6">
        <div className="space-y-4 mb-6 max-h-[500px] overflow-y-auto">
          {messages.map((msg, idx) => (
            <ChatBubble key={idx} role={msg.role} content={msg.content} />
          ))}
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {suggestedPrompts.map(prompt => (
            <Badge
              key={prompt}
              variant="secondary"
              className="cursor-pointer hover-elevate"
              onClick={() => setMessage(prompt)}
              data-testid={`badge-suggested-${prompt.slice(0, 10)}`}
            >
              {prompt}
            </Badge>
          ))}
        </div>

        <div className="flex gap-2">
          <Input
            placeholder="Ask me anything..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            className="rounded-full"
            data-testid="input-ai-message"
          />
          <Button 
            size="icon" 
            className="rounded-full bg-gradient-to-r from-primary to-chart-2"
            onClick={handleSend}
            data-testid="button-send-message"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    </div>
  );
}
