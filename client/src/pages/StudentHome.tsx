import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import type { Post, User, Comment, Reaction, UserBadge, Badge, Challenge } from "@shared/schema";
import { PostCard } from "@/components/PostCard";
import { CreatePostModal } from "@/components/CreatePostModal";
import { SuggestedPosts } from "@/components/SuggestedPosts";
import { RankTierBadge } from "@/components/RankTierBadge";
import { ChallengeMilestonesCard } from "@/components/ChallengeMilestonesCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, TrendingUp, Users, Target, Sparkles } from "lucide-react";
import { useState } from "react";
import { Badge as BadgePill } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BadgeIcon } from "@/components/BadgeIcon";
import { Link } from "wouter";

type PostWithAuthor = Post & {
  author: User;
  comments: Comment[];
  reactions: Reaction[];
};

export default function StudentHome() {
  const { userData: user } = useAuth();
  const [createPostOpen, setCreatePostOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [interestFilter, setInterestFilter] = useState(false);
  const [postInitialValues, setPostInitialValues] = useState<{ content: string; category: string; tags: string }>({ 
    content: "", 
    category: "social", 
    tags: "" 
  });

  const { data: posts = [], isLoading } = useQuery<PostWithAuthor[]>({
    queryKey: ["/api/posts", selectedCategory, interestFilter ? 'interests' : 'all', user?.id],
    queryFn: async () => {
      const params = new URLSearchParams({
        category: selectedCategory,
        ...(interestFilter && user?.id ? { filterByInterests: 'true', userId: user.id } : {})
      });
      const response = await fetch(`/api/posts?${params}`);
      if (!response.ok) throw new Error('Failed to fetch posts');
      return response.json();
    },
  });

  const { data: userBadges = [] } = useQuery<(UserBadge & { badge: Badge })[]>({
    queryKey: ["/api/user-badges", user?.id],
    enabled: !!user,
  });

  const { data: challenges = [] } = useQuery<Challenge[]>({
    queryKey: ["/api/challenges", "active"],
  });

  const categories = [
    { value: "all", label: "All Posts", icon: TrendingUp },
    { value: "academic", label: "Academic", icon: Target },
    { value: "social", label: "Social", icon: Users },
    { value: "project", label: "Projects", icon: Sparkles },
  ];

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Feed - Center Column */}
        <div className="lg:col-span-8 space-y-6">
          {/* Welcome Card */}
          <Card className="p-6 bg-gradient-to-r from-purple-600 to-pink-600 text-white">
            <h2 className="font-heading text-2xl font-bold mb-2">
              Welcome back, {user?.firstName}! 👋
            </h2>
            <p className="text-purple-100 mb-4">
              You're on a {user?.streak || 0} day streak! Keep it going.
            </p>
            
            <div className="mb-4">
              <RankTierBadge 
                rankTier={user?.rankTier as 'bronze' | 'silver' | 'gold' | 'platinum' || 'bronze'} 
                totalPoints={user?.totalPoints || 0}
                showProgress={true}
              />
            </div>

            <div className="flex gap-3 flex-wrap">
              <div className="bg-white/20 backdrop-blur rounded-lg px-4 py-2">
                <div className="text-2xl font-bold">{user?.engagementScore || 0}</div>
                <div className="text-xs text-purple-100">Engagement</div>
              </div>
              <div className="bg-white/20 backdrop-blur rounded-lg px-4 py-2">
                <div className="text-2xl font-bold">{user?.problemSolverScore || 0}</div>
                <div className="text-xs text-purple-100">Problem Solver</div>
              </div>
              <div className="bg-white/20 backdrop-blur rounded-lg px-4 py-2">
                <div className="text-2xl font-bold">{userBadges.length}</div>
                <div className="text-xs text-purple-100">Badges</div>
              </div>
              <div className="bg-white/20 backdrop-blur rounded-lg px-4 py-2">
                <div className="text-2xl font-bold">{user?.challengePoints || 0}</div>
                <div className="text-xs text-purple-100">Challenge Pts</div>
              </div>
            </div>
          </Card>

          {/* Category Filter */}
          <div className="flex gap-2 flex-wrap items-center">
            {categories.map((cat) => {
              const Icon = cat.icon;
              return (
                <Button
                  key={cat.value}
                  variant={selectedCategory === cat.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(cat.value)}
                  className="gap-2"
                  data-testid={`filter-${cat.value}`}
                >
                  <Icon className="h-4 w-4" />
                  {cat.label}
                </Button>
              );
            })}
            {user?.interests && user.interests.length > 0 && (
              <Button
                variant={interestFilter ? "default" : "outline"}
                size="sm"
                onClick={() => setInterestFilter(!interestFilter)}
                className="gap-2 ml-auto"
                data-testid="filter-interests"
              >
                <Sparkles className="h-4 w-4" />
                {interestFilter ? "Showing My Interests" : "Filter by Interests"}
              </Button>
            )}
          </div>

          {/* Create Post Button */}
          <Button
            onClick={() => setCreatePostOpen(true)}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold"
            size="lg"
            data-testid="button-create-post"
          >
            <Plus className="mr-2 h-5 w-5" />
            Share Something Amazing
          </Button>

          {/* Posts Feed */}
          <div className="space-y-4">
            {isLoading ? (
              <Card className="p-8 text-center">
                <div className="animate-pulse">Loading posts...</div>
              </Card>
            ) : posts.length === 0 ? (
              <Card className="p-12 text-center">
                <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="font-semibold text-lg mb-2">No posts yet</h3>
                <p className="text-muted-foreground mb-4">
                  Be the first to share something with the community!
                </p>
                <Button onClick={() => setCreatePostOpen(true)} data-testid="button-create-first-post">
                  Create Your First Post
                </Button>
              </Card>
            ) : (
              posts.map((post) => <PostCard key={post.id} post={post} />)
            )}
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          {/* Quick Stats */}
          <Card className="p-6">
            <h3 className="font-heading font-semibold text-lg mb-4">Your Progress</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Level Progress</span>
                  <span className="text-sm text-muted-foreground">Level {Math.floor((user?.engagementScore || 0) / 100)}</span>
                </div>
                <Progress value={((user?.engagementScore || 0) % 100)} className="h-2" />
              </div>
              
              <Link href="/leaderboard">
                <a className="block" data-testid="link-leaderboard">
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <TrendingUp className="h-4 w-4" />
                    View Leaderboard
                  </Button>
                </a>
              </Link>
            </div>
          </Card>

          {/* Challenge Journey */}
          {user?.id && <ChallengeMilestonesCard userId={user.id} />}

          {/* AI Post Suggestions */}
          <SuggestedPosts 
            onSelectSuggestion={(content, category, tags) => {
              setPostInitialValues({
                content,
                category,
                tags: tags.join(", ")
              });
              setCreatePostOpen(true);
            }} 
          />

          {/* Recent Badges */}
          {userBadges.length > 0 && (
            <Card className="p-6">
              <h3 className="font-heading font-semibold text-lg mb-4">Recent Badges</h3>
              <div className="grid grid-cols-3 gap-3">
                {userBadges.slice(0, 6).map((ub) => (
                  <div key={ub.id} className="flex justify-center">
                    <BadgeIcon badge={ub.badge} size="md" />
                  </div>
                ))}
              </div>
              {userBadges.length > 6 && (
                <Link href="/profile">
                  <a data-testid="link-view-all-badges">
                    <Button variant="ghost" className="w-full mt-4">
                      View All {userBadges.length} Badges
                    </Button>
                  </a>
                </Link>
              )}
            </Card>
          )}

          {/* Active Challenges */}
          {challenges.length > 0 && (
            <Card className="p-6">
              <h3 className="font-heading font-semibold text-lg mb-4">Active Challenges</h3>
              <div className="space-y-3">
                {challenges.slice(0, 3).map((challenge) => (
                  <div key={challenge.id} className="border rounded-lg p-3 hover-elevate">
                    <div className="font-medium text-sm mb-1">{challenge.title}</div>
                    <div className="text-xs text-muted-foreground mb-2 line-clamp-2">
                      {challenge.description}
                    </div>
                    <BadgePill variant="secondary" className="text-xs">
                      {challenge.participantCount} participants
                    </BadgePill>
                  </div>
                ))}
              </div>
              <Link href="/challenges">
                <a data-testid="link-view-challenges">
                  <Button variant="ghost" className="w-full mt-4">
                    View All Challenges
                  </Button>
                </a>
              </Link>
            </Card>
          )}
        </div>
      </div>

      <CreatePostModal 
        open={createPostOpen} 
        onOpenChange={setCreatePostOpen}
        initialContent={postInitialValues.content}
        initialCategory={postInitialValues.category}
        initialTags={postInitialValues.tags}
      />
    </div>
  );
}
