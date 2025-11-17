import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Post, User, Comment, Reaction } from "@shared/schema";
import { PostCard } from "@/components/PostCard";
import { CreatePostModal } from "@/components/CreatePostModal";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, TrendingUp, Users } from "lucide-react";

type PostWithAuthor = Post & {
  author: User;
  comments: Comment[];
  reactions: Reaction[];
};

interface UniversalFeedProps {
  role: string;
  initialCategory?: string;
}

export function UniversalFeed({ role, initialCategory = "social" }: UniversalFeedProps) {
  const [createPostOpen, setCreatePostOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [feedType, setFeedType] = useState<'personalized' | 'following'>('personalized');

  // Personalized AI-curated feed
  const personalizedUrl = selectedCategory && selectedCategory !== 'all'
    ? `/api/feed/personalized?limit=20&category=${selectedCategory}`
    : `/api/feed/personalized?limit=20`;
  
  const { data: personalizedPosts = [], isLoading: isLoadingPersonalized } = useQuery<PostWithAuthor[]>({
    queryKey: [personalizedUrl],
    enabled: feedType === 'personalized',
  });

  // Following feed (chronological from followed users only)
  const followingUrl = selectedCategory && selectedCategory !== 'all'
    ? `/api/feed/following?category=${selectedCategory}`
    : `/api/feed/following`;
  
  const { data: followingPosts = [], isLoading: isLoadingFollowing } = useQuery<PostWithAuthor[]>({
    queryKey: [followingUrl],
    enabled: feedType === 'following',
  });

  const posts = feedType === 'personalized' ? personalizedPosts : followingPosts;
  const isLoading = feedType === 'personalized' ? isLoadingPersonalized : isLoadingFollowing;

  const categories = [
    { value: "all", label: "All Posts", icon: TrendingUp },
    { value: "academic", label: "Academic" },
    { value: "social", label: "Social" },
    { value: "project", label: "Projects" },
  ];

  return (
    <div className="space-y-4">
      {/* Create Post Button */}
      <Card className="p-4">
        <Button 
          onClick={() => setCreatePostOpen(true)} 
          className="w-full"
          data-testid="button-create-post"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Post
        </Button>
      </Card>

      {/* Feed Type Toggle */}
      <Tabs value={feedType} onValueChange={(v) => setFeedType(v as 'personalized' | 'following')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="personalized" data-testid="tab-personalized">
            <TrendingUp className="h-4 w-4 mr-2" />
            For You
          </TabsTrigger>
          <TabsTrigger value="following" data-testid="tab-following">
            <Users className="h-4 w-4 mr-2" />
            Following
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Category Filter */}
      <div className="flex gap-2 flex-wrap">
        {categories.map((category) => (
          <Button
            key={category.value}
            variant={selectedCategory === category.value ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(category.value)}
            data-testid={`filter-${category.value}`}
          >
            {category.label}
          </Button>
        ))}
      </div>

      {/* Posts Feed */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="p-6">
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
              </div>
            </Card>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">
            No posts yet. {feedType === 'following' ? 'Follow some users to see their posts here!' : 'Be the first to post!'}
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}

      {/* Create Post Modal */}
      <CreatePostModal
        open={createPostOpen}
        onOpenChange={setCreatePostOpen}
        initialCategory={initialCategory}
      />
    </div>
  );
}
