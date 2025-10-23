import { Users, MessageSquare, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ChannelCardProps {
  name: string;
  university: string;
  course: string;
  members: number;
  posts: number;
  trending?: boolean;
}

export function ChannelCard({ name, university, course, members, posts, trending }: ChannelCardProps) {
  return (
    <Card className="rounded-xl p-4 hover-elevate" data-testid={`card-channel-${name.toLowerCase().replace(/\s/g, '-')}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-display font-semibold" data-testid="text-channel-name">{name}</h3>
            {trending && (
              <Badge variant="secondary" className="bg-chart-3/10 text-chart-3 text-xs">
                <TrendingUp className="h-3 w-3 mr-1" />
                Trending
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{university}</p>
          <p className="text-xs text-muted-foreground">{course}</p>
        </div>
      </div>
      
      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
        <div className="flex items-center gap-1">
          <Users className="h-4 w-4" />
          <span data-testid="text-members-count">{members}</span>
        </div>
        <div className="flex items-center gap-1">
          <MessageSquare className="h-4 w-4" />
          <span data-testid="text-posts-count">{posts} posts</span>
        </div>
      </div>
      
      <Button className="w-full rounded-full" variant="outline" data-testid="button-join-channel">
        Join Channel
      </Button>
    </Card>
  );
}
