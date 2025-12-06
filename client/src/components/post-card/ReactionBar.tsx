import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, ThumbsUp, Lightbulb, Handshake } from "lucide-react";

const reactionTypes = [
  { type: "like", icon: ThumbsUp, label: "Like" },
  { type: "celebrate", icon: Heart, label: "Celebrate" },
  { type: "insightful", icon: Lightbulb, label: "Insightful" },
  { type: "support", icon: Handshake, label: "Support" },
];

interface ReactionBarProps {
  commentsCount: number;
  showComments: boolean;
  onToggleComments: () => void;
  onReaction: (type: string) => void;
  getReactionCount: (type: string) => number;
  hasUserReacted: (type: string) => boolean;
}

export function ReactionBar({
  commentsCount,
  showComments,
  onToggleComments,
  onReaction,
  getReactionCount,
  hasUserReacted,
}: ReactionBarProps) {
  return (
    <div className="flex items-center gap-1 mb-4 flex-wrap">
      {reactionTypes.map(({ type, icon: Icon, label }) => {
        const count = getReactionCount(type);
        const isActive = hasUserReacted(type);
        
        return (
          <Button
            key={type}
            variant={isActive ? "default" : "ghost"}
            size="sm"
            onClick={() => onReaction(type)}
            className={`gap-1 ${isActive ? 'bg-primary/10 text-primary' : ''}`}
            data-testid={`button-react-${type}`}
          >
            <Icon className="h-4 w-4" />
            {count > 0 && <span className="text-xs">{count}</span>}
          </Button>
        );
      })}
      
      <Button
        variant="ghost"
        size="sm"
        onClick={onToggleComments}
        className="gap-1 ml-auto"
        data-testid="button-toggle-comments"
      >
        <MessageCircle className="h-4 w-4" />
        {commentsCount > 0 && <span className="text-xs">{commentsCount}</span>}
      </Button>
    </div>
  );
}
