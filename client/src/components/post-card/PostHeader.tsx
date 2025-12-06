import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/UserAvatar";
import { Badge } from "@/components/ui/badge";
import { BadgeCheck, MoreHorizontal, Edit, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { PostWithAuthor } from "./usePostCard";

interface PostHeaderProps {
  post: PostWithAuthor;
  canModifyPost: boolean;
  isOwnPost: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

export function PostHeader({ post, canModifyPost, isOwnPost, onEdit, onDelete }: PostHeaderProps) {
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
        <div className="text-sm text-muted-foreground">
          {post.createdAt && formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
          {post.category && (
            <>
              {" · "}
              <span className="capitalize">{post.category}</span>
            </>
          )}
        </div>
      </div>
      {canModifyPost && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" data-testid="button-post-menu">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {isOwnPost && (
              <DropdownMenuItem onClick={onEdit} data-testid="button-edit-post">
                <Edit className="h-4 w-4 mr-2" />
                Edit Post
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={onDelete}
              className="text-destructive"
              data-testid="button-delete-post"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Post
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
