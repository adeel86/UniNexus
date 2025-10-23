import { ArrowUp, CheckCircle2, MessageCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Question, User } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

interface QuestionCardProps {
  question: Question;
}

export function QuestionCard({ question }: QuestionCardProps) {
  const [upvoted, setUpvoted] = useState(false);
  const [upvoteCount, setUpvoteCount] = useState(question.upvotes);

  const { data: author } = useQuery<User>({
    queryKey: [`/api/auth/user/${question.userId}`],
    enabled: !!question.userId,
  });

  const handleUpvote = () => {
    setUpvoted(!upvoted);
    setUpvoteCount(upvoted ? upvoteCount - 1 : upvoteCount + 1);
  };

  if (!author) return null;

  const timeAgo = formatDistanceToNow(new Date(question.createdAt), { addSuffix: true });

  return (
    <Card className="rounded-xl p-4 hover-elevate" data-testid={`card-question-${question.id}`}>
      <div className="flex gap-4">
        <div className="flex flex-col items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className={`rounded-full ${upvoted ? 'text-primary' : ''}`}
            onClick={handleUpvote}
            data-testid="button-upvote"
          >
            <ArrowUp className="h-5 w-5" />
          </Button>
          <span className={`text-sm font-semibold ${upvoted ? 'text-primary' : ''}`} data-testid="text-upvote-count">
            {upvoteCount}
          </span>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 mb-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={author.photoURL || ""} />
              <AvatarFallback className="text-xs">
                {author.displayName?.split(' ').map(n => n[0]).join('') || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm">{author.displayName}</span>
                <span className="text-xs text-muted-foreground">{timeAgo}</span>
                {question.solved && (
                  <Badge variant="secondary" className="bg-green-500/10 text-green-600 dark:text-green-400">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Solved
                  </Badge>
                )}
              </div>
            </div>
          </div>
          
          <h3 className="font-display font-semibold mb-2" data-testid="text-question-title">{question.title}</h3>
          <p className="text-sm text-muted-foreground mb-3 leading-relaxed" data-testid="text-question-content">
            {question.content}
          </p>
          
          {question.tags && question.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {question.tags.map(tag => (
                <Badge key={tag} variant="secondary" className="text-xs" data-testid={`badge-tag-${tag}`}>
                  {tag}
                </Badge>
              ))}
            </div>
          )}
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MessageCircle className="h-4 w-4" />
            <span data-testid="text-answers-count">{question.answersCount} answers</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
