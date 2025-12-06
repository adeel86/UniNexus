import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/UserAvatar";
import { Users } from "lucide-react";

interface FollowersFollowingListProps {
  type: 'followers' | 'following';
  data: any[];
  onClose: () => void;
}

export function FollowersFollowingList({ type, data, onClose }: FollowersFollowingListProps) {
  const title = type === 'followers' ? 'Followers' : 'Following';
  const emptyMessage = type === 'followers' ? 'No followers yet' : 'Not following anyone yet';

  return (
    <Card className="p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading text-xl font-semibold flex items-center gap-2">
          <Users className="h-5 w-5" />
          {title} ({data.length})
        </h3>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onClose} 
          data-testid={`button-close-${type}`}
        >
          Close
        </Button>
      </div>
      {data.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.map((item: any) => item.user && (
            <div 
              key={item.user.id} 
              className="flex items-center gap-3 p-3 rounded-lg hover-elevate" 
              data-testid={`${type.slice(0, -1)}-${item.user.id}`}
            >
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
        <p className="text-center text-muted-foreground py-8">{emptyMessage}</p>
      )}
    </Card>
  );
}
