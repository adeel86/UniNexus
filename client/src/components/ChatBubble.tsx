import { Bot, User } from "lucide-react";

interface ChatBubbleProps {
  role: "user" | "assistant";
  content: string;
}

export function ChatBubble({ role, content }: ChatBubbleProps) {
  const isUser = role === "user";
  
  return (
    <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`} data-testid={`chat-bubble-${role}`}>
      {!isUser && (
        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-chart-2 flex items-center justify-center flex-shrink-0">
          <Bot className="h-4 w-4 text-white" />
        </div>
      )}
      
      <div className={`max-w-[80%] rounded-2xl p-3 ${
        isUser 
          ? 'bg-gradient-to-r from-primary to-chart-2 text-white' 
          : 'bg-card border'
      }`}>
        <p className="text-sm leading-relaxed" data-testid="text-chat-content">{content}</p>
      </div>
      
      {isUser && (
        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-chart-2 to-chart-3 flex items-center justify-center flex-shrink-0">
          <User className="h-4 w-4 text-white" />
        </div>
      )}
    </div>
  );
}
