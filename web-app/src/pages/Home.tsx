import { PostComposer } from "@/components/PostComposer";
import { PostCard } from "@/components/PostCard";
import { ChannelCard } from "@/components/ChannelCard";
import { Card } from "@/components/ui/card";
import { TrendingUp, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { usePosts } from "@/hooks/usePosts";
import { useChannels } from "@/hooks/useChannels";

export default function Home() {
  const { data: posts, isLoading: postsLoading } = usePosts(20);
  const { data: channels, isLoading: channelsLoading } = useChannels();

  const trendingTopics = ["MachineLearning", "WebDev", "DataStructures", "Python", "React"];
  const suggestedChannels = channels?.slice(0, 2) || [];

  return (
    <div className="max-w-7xl mx-auto px-4 pt-20 pb-24 md:pb-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          <PostComposer />
          
          {postsLoading ? (
            <Card className="rounded-2xl p-8 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </Card>
          ) : posts && posts.length > 0 ? (
            posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))
          ) : (
            <Card className="rounded-2xl p-8 text-center text-muted-foreground">
              No posts yet. Be the first to share something!
            </Card>
          )}
        </div>

        <div className="lg:col-span-4 space-y-6">
          <Card className="rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h3 className="font-display font-semibold">Trending Topics</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {trendingTopics.map(topic => (
                <Badge 
                  key={topic} 
                  variant="secondary" 
                  className="rounded-full hover-elevate cursor-pointer"
                  data-testid={`badge-trending-${topic}`}
                >
                  #{topic}
                </Badge>
              ))}
            </div>
          </Card>

          <div>
            <h3 className="font-display font-semibold mb-4">Suggested Channels</h3>
            {channelsLoading ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-3">
                {suggestedChannels.map((channel) => (
                  <ChannelCard
                    key={channel.id}
                    name={channel.name}
                    university={channel.university}
                    course={channel.course}
                    members={channel.membersCount}
                    posts={channel.postsCount}
                    trending={channel.trending}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
