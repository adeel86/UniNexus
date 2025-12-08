import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/UserAvatar";
import { Users, UserPlus, UserMinus, X } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import type { User } from "@shared/schema";

interface FollowersFollowingListProps {
  type: 'followers' | 'following';
  data: any[];
  onClose: () => void;
  currentUserId?: string;
  isOwnProfile?: boolean;
  targetUserId?: string;
}

export function FollowersFollowingList({ 
  type, 
  data, 
  onClose, 
  currentUserId,
  isOwnProfile = false,
  targetUserId
}: FollowersFollowingListProps) {
  const title = type === 'followers' ? 'Followers' : 'Following';
  const emptyMessage = type === 'followers' ? 'No followers yet' : 'Not following anyone yet';
  const profileUserId = targetUserId || currentUserId;

  return (
    <Card className="p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading text-xl font-semibold flex items-center gap-2">
          <Users className="h-5 w-5" />
          {title} ({data.length})
        </h3>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onClose} 
          data-testid={`button-close-${type}`}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      {data.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.map((item: any) => item.user && (
            <FollowerFollowingItem 
              key={item.user.id}
              user={item.user}
              type={type}
              currentUserId={currentUserId}
              isOwnProfile={isOwnProfile}
              profileUserId={profileUserId}
            />
          ))}
        </div>
      ) : (
        <p className="text-center text-muted-foreground py-8">{emptyMessage}</p>
      )}
    </Card>
  );
}

interface FollowerFollowingItemProps {
  user: User;
  type: 'followers' | 'following';
  currentUserId?: string;
  isOwnProfile: boolean;
  profileUserId?: string;
}

function FollowerFollowingItem({ user, type, currentUserId, isOwnProfile, profileUserId }: FollowerFollowingItemProps) {
  const { toast } = useToast();
  const isCurrentUser = user.id === currentUserId;

  const { data: followStatus } = useQuery<{ isFollowing: boolean }>({
    queryKey: [`/api/follow/status/${user.id}`],
    enabled: !!currentUserId && !isCurrentUser,
  });

  const followMutation = useMutation({
    mutationFn: async (action: 'follow' | 'unfollow') => {
      if (action === 'follow') {
        return apiRequest('POST', '/api/follow', { followingId: user.id });
      } else {
        return apiRequest('DELETE', `/api/follow/${user.id}`, {});
      }
    },
    onSuccess: (_, action) => {
      queryClient.invalidateQueries({ queryKey: [`/api/follow/status/${user.id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/followers/${profileUserId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/following/${profileUserId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/followers/${currentUserId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/following/${currentUserId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/followers/${user.id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/following/${user.id}`] });
      toast({
        title: action === 'follow' ? 'Followed' : 'Unfollowed',
        description: action === 'follow' 
          ? `You are now following ${user.firstName} ${user.lastName}`
          : `You unfollowed ${user.firstName} ${user.lastName}`,
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const removeFollowerMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('DELETE', `/api/followers/remove/${user.id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/followers/${currentUserId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/followers/${profileUserId}`] });
      toast({
        title: 'Removed',
        description: `${user.firstName} ${user.lastName} has been removed from your followers`,
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Could not remove follower. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleFollowAction = () => {
    followMutation.mutate(followStatus?.isFollowing ? 'unfollow' : 'follow');
  };

  const handleRemoveFollower = () => {
    removeFollowerMutation.mutate();
  };

  return (
    <div 
      className="flex items-center gap-3 p-3 rounded-lg hover-elevate" 
      data-testid={`${type.slice(0, -1)}-${user.id}`}
    >
      <Link href={`/profile?userId=${user.id}`}>
        <UserAvatar user={user} size="md" className="cursor-pointer" />
      </Link>
      <div className="flex-1 min-w-0">
        <Link href={`/profile?userId=${user.id}`}>
          <div className="font-medium truncate cursor-pointer hover:underline">
            {user.firstName} {user.lastName}
          </div>
        </Link>
        {user.major && (
          <div className="text-sm text-muted-foreground truncate">{user.major}</div>
        )}
        {user.university && (
          <div className="text-xs text-muted-foreground truncate">{user.university}</div>
        )}
      </div>
      
      {!isCurrentUser && currentUserId && (
        <div className="flex items-center gap-2 flex-shrink-0">
          {type === 'followers' && isOwnProfile && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRemoveFollower}
              disabled={removeFollowerMutation.isPending}
              data-testid={`button-remove-follower-${user.id}`}
              className="text-destructive hover:text-destructive"
            >
              {removeFollowerMutation.isPending ? '...' : 'Remove'}
            </Button>
          )}
          
          <Button
            variant={followStatus?.isFollowing ? "outline" : "default"}
            size="sm"
            onClick={handleFollowAction}
            disabled={followMutation.isPending}
            data-testid={`button-follow-${user.id}`}
          >
            {followMutation.isPending ? (
              <span className="animate-pulse">...</span>
            ) : followStatus?.isFollowing ? (
              <>
                <UserMinus className="h-4 w-4 mr-1" />
                Unfollow
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4 mr-1" />
                Follow
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
