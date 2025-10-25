import { Heart, MessageCircle, Share2, Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Post, User } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

interface PostCardProps {
  post: Post;
}

export function PostCard({ post }: PostCardProps) {
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likes);

  const { data: author } = useQuery<User>({
    queryKey: [`/api/auth/user/${post.userId}`],
    enabled: !!post.userId,
  });

  const handleLike = () => {
    setIsLiked(!isLiked);
    setLikeCount(isLiked ? likeCount - 1 : likeCount + 1);
  };

  if (!author) return null;

  const timeAgo = formatDistanceToNow(new Date(post.createdAt), { addSuffix: true });

  return (
    <Card className="rounded-2xl overflow-hidden hover-elevate" data-testid={`card-post-${post.id}`}>
      <div className="p-4">
        <div className="flex items-start gap-3 mb-3">
          <Avatar className="ring-2 ring-primary/10">
            <AvatarImage src={author.photoURL || ""} />
            <AvatarFallback className="bg-gradient-to-br from-primary to-chart-2 text-white">
              {author.displayName?.split(' ').map(n => n[0]).join('') || 'U'}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-sm" data-testid="text-author-name">{author.displayName}</h4>
            </div>
            <p className="text-xs text-muted-foreground">{author.university} · {author.course}</p>
          </div>
          
          <span className="text-xs text-muted-foreground whitespace-nowrap">{timeAgo}</span>
        </div>

        <p className="text-sm mb-3 leading-relaxed" data-testid="text-post-content">{post.content}</p>

        {post.mediaUrls && post.mediaUrls.length > 0 && (
          <img 
            src={post.mediaUrls[0]} 
            alt="Post" 
            className="rounded-xl w-full mb-3 object-cover max-h-96"
            data-testid="img-post"
          />
        )}

        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {post.tags.map(tag => (
              <Badge 
                key={tag} 
                variant="secondary" 
                className="rounded-full text-xs bg-primary/10 text-primary hover:bg-primary/20"
                data-testid={`badge-tag-${tag}`}
              >
                #{tag}
              </Badge>
            ))}
          </div>
        )}

        <div className="flex items-center gap-1 pt-2 border-t">
          <Button 
            variant="ghost" 
            size="sm" 
            className={`gap-2 ${isLiked ? 'text-chart-3' : ''}`}
            onClick={handleLike}
            data-testid="button-like"
          >
            <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
            <span className="text-xs">{likeCount}</span>
          </Button>
          
          <Button variant="ghost" size="sm" className="gap-2" data-testid="button-comment">
            <MessageCircle className="h-4 w-4" />
            <span className="text-xs">{post.commentsCount}</span>
          </Button>
          
          <Button variant="ghost" size="sm" className="gap-2" data-testid="button-share">
            <Share2 className="h-4 w-4" />
            <span className="text-xs">Share</span>
          </Button>
          
          <div className="flex-1" />
          
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setIsSaved(!isSaved)}
            data-testid="button-save"
          >
            <Bookmark className={`h-4 w-4 ${isSaved ? 'fill-current' : ''}`} />
          </Button>
        </div>
      </div>
    </Card>
  );
}
