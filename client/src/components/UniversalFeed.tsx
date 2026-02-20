import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Post, User, Comment, Reaction } from "@shared/schema";
import { PostCard } from "@/components/PostCard";
import { CreatePostModal } from "@/components/CreatePostModal";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, TrendingUp, Users } from "lucide-react";
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
}

export function UniversalFeed({ role, initialCategory = "social", showOnlyOwnPosts = false }: UniversalFeedProps) {
  const { userData: user } = useAuth();
  const [createPostOpen, setCreatePostOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [feedType, setFeedType] = useState<'personalized' | 'following'>('personalized');

  // My Posts logic
  const myPostsUrl = `/api/posts?authorId=${user?.id}`;
  const { data: myPosts = [], isLoading: isLoadingMyPosts } = useQuery<PostWithAuthor[]>({
    queryKey: [myPostsUrl],
    enabled: !!user?.id && showOnlyOwnPosts,
  });

  // Personalized AI-curated feed
  const personalizedUrl = selectedCategory && selectedCategory !== 'all'
    ? `/api/feed/personalized?limit=20&category=${selectedCategory}`
    : `/api/feed/personalized?limit=20`;
  
  const { data: personalizedPosts = [], isLoading: isLoadingPersonalized } = useQuery<PostWithAuthor[]>({
    queryKey: [personalizedUrl],
    enabled: !showOnlyOwnPosts && feedType === 'personalized',
  });

  // Following feed (chronological from followed users only)
  const followingUrl = selectedCategory && selectedCategory !== 'all'
    ? `/api/feed/following?category=${selectedCategory}`
    : `/api/feed/following`;
  
  const { data: followingPosts = [], isLoading: isLoadingFollowing } = useQuery<PostWithAuthor[]>({
    queryKey: [followingUrl],
    enabled: !showOnlyOwnPosts && feedType === 'following',
  });

  const posts = showOnlyOwnPosts ? myPosts : (feedType === 'personalized' ? personalizedPosts : followingPosts);
  const isLoading = showOnlyOwnPosts ? isLoadingMyPosts : (feedType === 'personalized' ? isLoadingPersonalized : isLoadingFollowing);

  const categories = [
    { value: "all", label: "All Posts", icon: TrendingUp },
    { value: "academic", label: "Academic" },
    { value: "social", label: "Social" },
    { value: "project", label: "Projects" },
  ];

  return (
    <div className="space-y-4">
      {!showOnlyOwnPosts && (
        <Card className="p-4 border-dashed border-2 hover:border-primary/50 transition-colors cursor-pointer" onClick={() => setCreatePostOpen(true)}>
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
              <Plus className="h-5 w-5 text-muted-foreground" />
            </div>
            <span className="text-muted-foreground font-medium">Share something with the community...</span>
          </div>
        </Card>
      )}

      {/* Feed Type Toggle */}
      {!showOnlyOwnPosts && (
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
      )}

      {/* Category Filter */}
      {!showOnlyOwnPosts && (
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

      {showOnlyOwnPosts && (
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold font-heading">My Posts</h2>
          <Button onClick={() => setCreatePostOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New Post
          </Button>
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
