import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { UserAvatar } from "@/components/UserAvatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { UserBadge, Badge as BadgeType, Endorsement, Skill, User, Certification, Post, Comment, Reaction } from "@shared/schema";
import { BadgeIcon } from "@/components/BadgeIcon";
import { AchievementTimeline } from "@/components/AchievementTimeline";
import { CertificateShowcase } from "@/components/CertificateShowcase";
import { RankTierBadge } from "@/components/RankTierBadge";
import { PostCard } from "@/components/PostCard";
import { Award, TrendingUp, Zap, Trophy, Clock, Shield, Users, UserPlus, UserMinus, CheckCircle } from "lucide-react";
import { useLocation } from "wouter";
import { useState } from "react";

type PostWithAuthor = Post & {
  author: User;
  comments: Comment[];
  reactions: Reaction[];
};

export default function Profile() {
  const { userData: currentUser } = useAuth();
  const [location] = useLocation();
  
  // Get userId from query params if viewing another user's profile
  const params = new URLSearchParams(location.split('?')[1] || '');
  const viewingUserId = params.get('userId');
  const isViewingOwnProfile = !viewingUserId || viewingUserId === currentUser?.id;
  
  // Determine which user ID to use for queries
  const targetUserId = viewingUserId || currentUser?.id;
  
  // Fetch viewed user data if viewing someone else's profile
  const { data: viewedUser, isLoading: userLoading } = useQuery<User>({
    queryKey: [`/api/users/${viewingUserId}`],
    enabled: !!viewingUserId && !isViewingOwnProfile,
  });
  
  // Use currentUser if viewing own profile, otherwise use viewedUser
  const user = isViewingOwnProfile ? currentUser : viewedUser;

  const { data: userBadges = [] } = useQuery<(UserBadge & { badge: BadgeType })[]>({
    queryKey: [`/api/user-badges/${targetUserId}`],
    enabled: !!targetUserId,
  });

  const { data: endorsements = [] } = useQuery<(Endorsement & { endorser: User, skill?: Skill })[]>({
    queryKey: [`/api/endorsements/${targetUserId}`],
    enabled: !!targetUserId,
  });

  const { data: certifications = [] } = useQuery<Certification[]>({
    queryKey: [`/api/certifications/user/${targetUserId}`],
    enabled: !!targetUserId,
  });

  // Fetch followers and following
  const { data: followersData = [] } = useQuery<any[]>({
    queryKey: [`/api/followers/${targetUserId}`],
    enabled: !!targetUserId,
  });

  const { data: followingData = [] } = useQuery<any[]>({
    queryKey: [`/api/following/${targetUserId}`],
    enabled: !!targetUserId,
  });

  // Fetch user's posts
  const { data: userPosts = [] } = useQuery<PostWithAuthor[]>({
    queryKey: [`/api/posts`, 'author', targetUserId],
    queryFn: async () => {
      const response = await fetch(`/api/posts?authorId=${targetUserId}`);
      if (!response.ok) throw new Error('Failed to fetch user posts');
      return response.json();
    },
    enabled: !!targetUserId,
  });

  // Check follow status if viewing someone else's profile
  const { data: followStatus } = useQuery<{ following: boolean }>({
    queryKey: [`/api/follow/status/${targetUserId}`],
    enabled: !!currentUser && !isViewingOwnProfile,
  });

  // Follow/unfollow mutation
  const followMutation = useMutation({
    mutationFn: async (action: 'follow' | 'unfollow') => {
      if (action === 'follow') {
        return apiRequest('POST', '/api/follow', { followingId: targetUserId });
      } else {
        return apiRequest('DELETE', `/api/follow/${targetUserId}`, {});
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/follow/status/${targetUserId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/followers/${targetUserId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/following/${currentUser?.id}`] });
    },
  });

  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);

  if (userLoading || !user) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-5xl">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading profile...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl">
      {/* Profile Header */}
      <Card className="p-8 mb-6 bg-gradient-to-r from-purple-600 to-pink-600 text-white">
        <div className="flex items-start justify-between gap-6">
          <div className="flex items-start gap-6 flex-1">
            <UserAvatar user={user} size="xl" className="border-4 border-white" />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h1 className="font-heading text-3xl font-bold">
                  {user.firstName} {user.lastName}
                </h1>
                {user.isVerified && (
                  <div className="flex items-center gap-1 bg-blue-500/30 backdrop-blur px-3 py-1 rounded-full">
                    <CheckCircle className="h-5 w-5 fill-white" />
                    <span className="text-sm font-medium">Verified</span>
                  </div>
                )}
              </div>
              {user.major && (
                <p className="text-purple-100 text-lg mb-1">{user.major}</p>
              )}
              {user.university && (
                <p className="text-purple-100 mb-3">{user.university}</p>
              )}
              
              {/* Followers/Following counts */}
              <div className="flex gap-6 mt-4">
                <button 
                  onClick={() => setShowFollowers(!showFollowers)}
                  className="hover-elevate rounded-lg p-2 transition-all"
                  data-testid="button-followers"
                >
                  <div className="text-2xl font-bold">{followersData.length}</div>
                  <div className="text-sm text-purple-100">Followers</div>
                </button>
                <button 
                  onClick={() => setShowFollowing(!showFollowing)}
                  className="hover-elevate rounded-lg p-2 transition-all"
                  data-testid="button-following"
                >
                  <div className="text-2xl font-bold">{followingData.length}</div>
                  <div className="text-sm text-purple-100">Following</div>
                </button>
                <div className="p-2">
                  <div className="text-2xl font-bold">{userPosts.length}</div>
                  <div className="text-sm text-purple-100">Posts</div>
                </div>
              </div>
              
              {user.bio && (
                <p className="text-white/90 mt-4">{user.bio}</p>
              )}
              
              {/* Rank Tier Badge */}
              <div className="mt-4">
                <RankTierBadge 
                  rankTier={user.rankTier as 'bronze' | 'silver' | 'gold' | 'platinum'} 
                  totalPoints={user.totalPoints || 0}
                  size="lg"
                />
              </div>
            </div>
          </div>
          
          {/* Follow button (only show when viewing someone else's profile) */}
          {!isViewingOwnProfile && currentUser && (
            <div>
              <Button
                onClick={() => followMutation.mutate(followStatus?.following ? 'unfollow' : 'follow')}
                disabled={followMutation.isPending}
                variant={followStatus?.following ? "outline" : "default"}
                size="lg"
                className={followStatus?.following ? "bg-white/20 backdrop-blur" : "bg-white text-purple-600 hover:bg-white/90"}
                data-testid="button-follow"
              >
                {followMutation.isPending ? (
                  <span className="animate-pulse">...</span>
                ) : followStatus?.following ? (
                  <>
                    <UserMinus className="mr-2 h-5 w-5" />
                    Unfollow
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-5 w-5" />
                    Follow
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-white/20 backdrop-blur rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-5 w-5" />
              <span className="text-sm">Engagement</span>
            </div>
            <div className="text-2xl font-bold">{user.engagementScore || 0}</div>
          </div>

          <div className="bg-white/20 backdrop-blur rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <Trophy className="h-5 w-5" />
              <span className="text-sm">Problem Solver</span>
            </div>
            <div className="text-2xl font-bold">{user.problemSolverScore || 0}</div>
          </div>

          <div className="bg-white/20 backdrop-blur rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <Award className="h-5 w-5" />
              <span className="text-sm">Endorsements</span>
            </div>
            <div className="text-2xl font-bold">{user.endorsementScore || 0}</div>
          </div>

          <div className="bg-white/20 backdrop-blur rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="h-5 w-5" />
              <span className="text-sm">Streak</span>
            </div>
            <div className="text-2xl font-bold">{user.streak || 0} days</div>
          </div>
        </div>
      </Card>

      {/* Followers List */}
      {showFollowers && (
        <Card className="p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading text-xl font-semibold flex items-center gap-2">
              <Users className="h-5 w-5" />
              Followers ({followersData.length})
            </h3>
            <Button variant="ghost" size="sm" onClick={() => setShowFollowers(false)} data-testid="button-close-followers">
              Close
            </Button>
          </div>
          {followersData.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {followersData.map((item: any) => item.user && (
                <div key={item.user.id} className="flex items-center gap-3 p-3 rounded-lg hover-elevate" data-testid={`follower-${item.user.id}`}>
                  <UserAvatar user={item.user} size="md" />
                  <div className="flex-1">
                    <div className="font-medium">{item.user.firstName} {item.user.lastName}</div>
                    {item.user.major && (
                      <div className="text-sm text-muted-foreground">{item.user.major}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">No followers yet</p>
          )}
        </Card>
      )}

      {/* Following List */}
      {showFollowing && (
        <Card className="p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading text-xl font-semibold flex items-center gap-2">
              <Users className="h-5 w-5" />
              Following ({followingData.length})
            </h3>
            <Button variant="ghost" size="sm" onClick={() => setShowFollowing(false)} data-testid="button-close-following">
              Close
            </Button>
          </div>
          {followingData.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {followingData.map((item: any) => item.user && (
                <div key={item.user.id} className="flex items-center gap-3 p-3 rounded-lg hover-elevate" data-testid={`following-${item.user.id}`}>
                  <UserAvatar user={item.user} size="md" />
                  <div className="flex-1">
                    <div className="font-medium">{item.user.firstName} {item.user.lastName}</div>
                    {item.user.major && (
                      <div className="text-sm text-muted-foreground">{item.user.major}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">Not following anyone yet</p>
          )}
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Badges */}
        <Card className="p-6">
          <h2 className="font-heading text-xl font-semibold mb-4 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-600" />
            Achievements ({userBadges.length})
          </h2>
          {userBadges.length > 0 ? (
            <div className="grid grid-cols-3 gap-4">
              {userBadges.map((ub) => (
                <div key={ub.id} className="flex flex-col items-center gap-2">
                  <BadgeIcon badge={ub.badge} size="lg" />
                  <div className="text-xs text-center font-medium">{ub.badge.name}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Trophy className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No badges earned yet</p>
              <p className="text-sm">Keep engaging to unlock achievements!</p>
            </div>
          )}
        </Card>

        {/* Endorsements */}
        <Card className="p-6">
          <h2 className="font-heading text-xl font-semibold mb-4 flex items-center gap-2">
            <Award className="h-5 w-5 text-purple-600" />
            Endorsements ({endorsements.length})
          </h2>
          {endorsements.length > 0 ? (
            <div className="space-y-3">
              {endorsements.slice(0, 5).map((endorsement) => (
                <div key={endorsement.id} className="border-l-2 border-primary pl-3 py-2">
                  <div className="flex items-center gap-2 mb-1">
                    <UserAvatar user={endorsement.endorser} size="sm" />
                    <div>
                      <div className="font-medium text-sm">
                        {endorsement.endorser.firstName} {endorsement.endorser.lastName}
                      </div>
                      {endorsement.skill && (
                        <Badge variant="secondary" className="text-xs mt-1">
                          {endorsement.skill.name}
                        </Badge>
                      )}
                    </div>
                  </div>
                  {endorsement.comment && (
                    <p className="text-sm text-muted-foreground mt-2">
                      "{endorsement.comment}"
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Award className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No endorsements yet</p>
              <p className="text-sm">Keep up the great work!</p>
            </div>
          )}
        </Card>
      </div>

      {/* Achievement Timeline */}
      <Card className="p-6 mt-6">
        <h2 className="font-heading text-xl font-semibold mb-6 flex items-center gap-2">
          <Clock className="h-5 w-5 text-blue-600" />
          Achievement Timeline
        </h2>
        <AchievementTimeline 
          userBadges={userBadges}
          endorsements={endorsements}
          engagementScore={user.engagementScore || 0}
        />
      </Card>

      {/* Digital Certificates (NFT-Style) */}
      <div className="mt-6">
        <h2 className="font-heading text-2xl font-semibold mb-4 flex items-center gap-2">
          <Shield className="h-6 w-6 text-purple-600" />
          Digital Certificates ({certifications.length})
        </h2>
        <CertificateShowcase certifications={certifications} />
      </div>

      {/* User's Posts */}
      <div className="mt-6">
        <h2 className="font-heading text-2xl font-semibold mb-4">
          Posts ({userPosts.length})
        </h2>
        {userPosts.length > 0 ? (
          <div className="space-y-4">
            {userPosts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        ) : (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">No posts yet</p>
          </Card>
        )}
      </div>
    </div>
  );
}
