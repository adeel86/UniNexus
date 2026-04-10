import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/UserAvatar";
import { Badge } from "@/components/ui/badge";
import { BadgeCheck, MoreHorizontal, Edit, Trash2, Repeat2, Flag } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { PostWithAuthor } from "./usePostCard";

interface PostHeaderProps {
  post: PostWithAuthor;
  canModifyPost: boolean;
  isOwnPost: boolean;
  isAuthenticated: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onReport: () => void;
}

export function PostHeader({ post, canModifyPost, isOwnPost, isAuthenticated, onEdit, onDelete, onReport }: PostHeaderProps) {
  const showMenu = canModifyPost || (!isOwnPost && isAuthenticated);

  return (
    <div className="flex gap-3 mb-4">
      <UserAvatar user={post.author} size="md" />
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold">
            {post.author.firstName} {post.author.lastName}
          </span>
          {post.author.isVerified && (
            <BadgeCheck className="h-4 w-4 text-primary" data-testid="icon-verified" />
          )}
          {post.author.role === 'student' && post.author.major && (
            <Badge variant="secondary" className="text-xs">
              {post.author.major}
            </Badge>
          )}
        </div>
        <div className="text-sm text-muted-foreground flex items-center gap-1 flex-wrap">
          {post.originalPostId && (
            <span className="flex items-center gap-1 text-primary/80 font-medium">
              <Repeat2 className="h-3 w-3" />
              Shared a post
              {" · "}
            </span>
          )}
          {post.createdAt && formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
          {post.category && (
            <>
              {" · "}
              <span className="capitalize">{post.category}</span>
            </>
          )}
        </div>
      </div>
      {showMenu && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" data-testid="button-post-menu">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {canModifyPost && isOwnPost && (
              <DropdownMenuItem onClick={onEdit} data-testid="button-edit-post">
                <Edit className="h-4 w-4 mr-2" />
                Edit Post
              </DropdownMenuItem>
            )}
            {canModifyPost && (
              <DropdownMenuItem
                onClick={onDelete}
                className="text-destructive"
                data-testid="button-delete-post"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Post
              </DropdownMenuItem>
            )}
            {!isOwnPost && isAuthenticated && (
              <>
                {canModifyPost && <DropdownMenuSeparator />}
                <DropdownMenuItem
                  onClick={onReport}
                  className="text-orange-600"
                  data-testid="button-report-post"
                >
                  <Flag className="h-4 w-4 mr-2" />
                  Report Post
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
