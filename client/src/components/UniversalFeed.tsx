import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Post, User, Comment, Reaction } from "@shared/schema";
import { PostCard } from "@/components/PostCard";
import { CreatePostModal } from "@/components/CreatePostModal";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, TrendingUp, Users, Trophy, Play, MessageCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

type PostWithAuthor = Post & {
  author: User;
  comments: Comment[];
  reactions: Reaction[];
};

interface UniversalFeedProps {
  role: string;
  initialCategory?: string;
  showOnlyOwnPosts?: boolean;
  feedType?: 'personalized' | 'my-posts';
}

export function UniversalFeed({ 
  role, 
  initialCategory = "social", 
  showOnlyOwnPosts = false,
  feedType: initialFeedType
}: UniversalFeedProps) {
  const { userData: user } = useAuth();
  const [createPostOpen, setCreatePostOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [feedType, setFeedType] = useState<'personalized' | 'my-posts'>(initialFeedType || (showOnlyOwnPosts ? 'my-posts' : 'personalized'));

  // My Posts logic
  const myPostsUrl = selectedCategory && selectedCategory !== 'all'
    ? `/api/posts?userId=${user?.id}&category=${selectedCategory}`
    : `/api/posts?userId=${user?.id}`;

  const { data: myPosts = [], isLoading: isLoadingMyPosts } = useQuery<PostWithAuthor[]>({
    queryKey: [myPostsUrl],
    enabled: !!user?.id && (showOnlyOwnPosts || feedType === 'my-posts'),
  });

  // Personalized AI-curated feed
  const personalizedUrl = selectedCategory && selectedCategory !== 'all'
    ? `/api/feed/personalized?limit=20&category=${selectedCategory}`
    : `/api/feed/personalized?limit=20`;
  
  const { data: personalizedPosts = [], isLoading: isLoadingPersonalized } = useQuery<PostWithAuthor[]>({
    queryKey: [personalizedUrl],
    enabled: !showOnlyOwnPosts && feedType === 'personalized',
  });

  const posts = feedType === 'my-posts' ? myPosts : personalizedPosts;
  const isLoading = feedType === 'my-posts' ? isLoadingMyPosts : isLoadingPersonalized;

  const categories = [
    { value: "all", label: "All Posts", icon: TrendingUp },
    { value: "academic", label: "Academic" },
    { value: "social", label: "Social" },
    { value: "project", label: "Projects" },
    { value: "achievement", label: "Achievement", icon: Trophy },
    { value: "reel", label: "Reel", icon: Play },
  ];

  return (
    <div className="space-y-4">
      {/* Feed Type Toggle */}
      {(!showOnlyOwnPosts && !initialFeedType) && (
        <Tabs value={feedType} onValueChange={(v) => setFeedType(v as 'personalized' | 'my-posts')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="personalized" data-testid="tab-personalized">
              <TrendingUp className="h-4 w-4 mr-2" />
              For You
            </TabsTrigger>
            <TabsTrigger value="my-posts" data-testid="tab-my-posts">
              <MessageCircle className="h-4 w-4 mr-2" />
              My Posts
            </TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {/* Category Filter */}
      {(!showOnlyOwnPosts || initialFeedType === 'my-posts') && (
        <div className="flex gap-2 flex-wrap">
          {categories.map((category) => (
            <Button
              key={category.value}
              variant={selectedCategory === category.value ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(category.value)}
              className="rounded-full"
              data-testid={`filter-${category.value}`}
            >
              {category.label}
            </Button>
          ))}
        </div>
      )}

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
            {feedType === 'my-posts' 
              ? "No posts yet. Be the first to share something with the community!" 
              : 'No posts available. Check back soon or follow more users!'}
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
