import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/UserAvatar";
import { RankTierBadge } from "@/components/RankTierBadge";
import { CVExportButton } from "@/components/CVExportButton";
import { CheckCircle, UserPlus, UserMinus, TrendingUp, Trophy, Award, Zap, Pencil } from "lucide-react";
import type { User } from "@shared/schema";

interface ProfileHeaderProps {
  user: User;
  isViewingOwnProfile: boolean;
  targetUserId: string;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  badgeCount?: number;
  followStatus?: { following: boolean };
  followMutation: { isPending: boolean; mutate: (action: 'follow' | 'unfollow') => void };
  onShowFollowers: () => void;
  onShowFollowing: () => void;
  onEditProfile?: () => void;
  currentUser: User | null | undefined;
}

export function ProfileHeader({
  user,
  isViewingOwnProfile,
  targetUserId,
  followersCount,
  followingCount,
  postsCount,
  badgeCount = 0,
  followStatus,
  followMutation,
  onShowFollowers,
  onShowFollowing,
  onEditProfile,
  currentUser,
}: ProfileHeaderProps) {
  return (
    <Card className="p-8 mb-6 bg-gradient-to-r from-purple-600 to-pink-600 text-white">
      <div className="flex flex-col lg:flex-row items-start justify-between gap-6">
        <div className="flex items-start gap-4 lg:gap-6 flex-1 w-full">
          <UserAvatar user={user} size="xl" className="border-4 border-white flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <h1 className="font-heading text-2xl lg:text-3xl font-bold">
                {user.firstName} {user.lastName}
              </h1>
              {user.isVerified && (
                <div className="flex items-center gap-1 bg-blue-500/30 backdrop-blur px-3 py-1 rounded-full">
                  <CheckCircle className="h-5 w-5 fill-white" />
                  <span className="text-xs lg:text-sm font-medium">Verified</span>
                </div>
              )}
            </div>
            {user.major && (
              <p className="text-purple-100 text-base lg:text-lg mb-1 truncate">{user.major}</p>
            )}
            {user.university && (
              <p className="text-purple-100 mb-3 truncate">{user.university}</p>
            )}
            
            <div className="flex gap-4 lg:gap-6 mt-4 flex-wrap">
              <button 
                onClick={onShowFollowers}
                className="hover-elevate rounded-lg p-2 transition-all"
                data-testid="button-followers"
              >
                <div className="text-xl lg:text-2xl font-bold">{followersCount}</div>
                <div className="text-xs lg:text-sm text-purple-100">Followers</div>
              </button>
              <button 
                onClick={onShowFollowing}
                className="hover-elevate rounded-lg p-2 transition-all"
                data-testid="button-following"
              >
                <div className="text-xl lg:text-2xl font-bold">{followingCount}</div>
                <div className="text-xs lg:text-sm text-purple-100">Following</div>
              </button>
              <div className="p-2">
                <div className="text-xl lg:text-2xl font-bold">{postsCount}</div>
                <div className="text-xs lg:text-sm text-purple-100">Posts</div>
              </div>
            </div>
            
            {user.bio && (
              <p className="text-white/90 mt-4 line-clamp-2">{user.bio}</p>
            )}
            
            <div className="mt-4">
              <RankTierBadge 
                rankTier={user.rankTier as 'bronze' | 'silver' | 'gold' | 'platinum'} 
                totalPoints={user.totalPoints || 0}
                size="lg"
              />
            </div>
          </div>
        </div>
        
        {isViewingOwnProfile && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto flex-shrink-0">
            {onEditProfile && (
              <Button
                onClick={onEditProfile}
                variant="outline"
                className="bg-white/20 backdrop-blur border-white/30 text-white text-sm lg:text-base"
                data-testid="button-edit-profile"
              >
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Button>
            )}
            {(user.role === "student" || user.role === "teacher") && <CVExportButton userId={targetUserId} />}
          </div>
        )}
        
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

      {user.role === "student" ? (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-6">
          <div className="bg-white/20 backdrop-blur rounded-lg p-3">
            <div className="flex items-center gap-1 mb-1">
              <TrendingUp className="h-4 w-4" />
              <span className="text-xs md:text-sm">Engagement</span>
            </div>
            <div className="text-xl md:text-2xl font-bold">{user.engagementScore || 0}</div>
          </div>
          <div className="bg-white/20 backdrop-blur rounded-lg p-3">
            <div className="flex items-center gap-1 mb-1">
              <Trophy className="h-4 w-4" />
              <span className="text-xs md:text-sm">Problem Solver</span>
            </div>
            <div className="text-xl md:text-2xl font-bold">{user.problemSolverScore || 0}</div>
          </div>
          <div className="bg-white/20 backdrop-blur rounded-lg p-3">
            <div className="flex items-center gap-1 mb-1">
              <Award className="h-4 w-4" />
              <span className="text-xs md:text-sm">Endorsements</span>
            </div>
            <div className="text-xl md:text-2xl font-bold">{user.endorsementScore || 0}</div>
          </div>
          <div className="bg-white/20 backdrop-blur rounded-lg p-3">
            <div className="flex items-center gap-1 mb-1">
              <Trophy className="h-4 w-4" />
              <span className="text-xs md:text-sm">Badges</span>
            </div>
            <div className="text-xl md:text-2xl font-bold">{badgeCount}</div>
          </div>
          <div className="bg-white/20 backdrop-blur rounded-lg p-3">
            <div className="flex items-center gap-1 mb-1">
              <Zap className="h-4 w-4" />
              <span className="text-xs md:text-sm">Streak</span>
            </div>
            <div className="text-xl md:text-2xl font-bold">{user.streak || 0}d</div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 mt-6">
          <div className="bg-white/20 backdrop-blur rounded-lg p-3">
            <div className="flex items-center gap-1 mb-1">
              <TrendingUp className="h-4 w-4" />
              <span className="text-xs md:text-sm">Engagement</span>
            </div>
            <div className="text-xl md:text-2xl font-bold">{user.engagementScore || 0}</div>
          </div>
          <div className="bg-white/20 backdrop-blur rounded-lg p-3">
            <div className="flex items-center gap-1 mb-1">
              <Zap className="h-4 w-4" />
              <span className="text-xs md:text-sm">Streak</span>
            </div>
            <div className="text-xl md:text-2xl font-bold">{user.streak || 0}d</div>
          </div>
        </div>
      )}
    </Card>
  );
}
