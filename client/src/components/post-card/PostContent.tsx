import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { VideoPlayer } from "@/components/VideoPlayer";
import { X } from "lucide-react";
import type { PostWithAuthor } from "./usePostCard";

interface PostContentProps {
  post: PostWithAuthor;
  isEditing: boolean;
  editContent: string;
  onEditChange: (content: string) => void;
  onSave: () => void;
  onCancel: () => void;
  isSaving: boolean;
}

export function PostContent({
  post,
  isEditing,
  editContent,
  onEditChange,
  onSave,
  onCancel,
  isSaving,
}: PostContentProps) {
  return (
    <div className="mb-4">
      {isEditing ? (
        <div className="space-y-2">
          <Textarea
            value={editContent}
            onChange={(e) => onEditChange(e.target.value)}
            className="min-h-24"
            data-testid="input-edit-content"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={onSave}
              disabled={isSaving}
              data-testid="button-save-edit"
            >
              Save
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={onCancel}
              data-testid="button-cancel-edit"
            >
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-base leading-relaxed whitespace-pre-wrap">{post.content}</p>
      )}
      
      {post.imageUrl && (
        <img
          src={post.imageUrl}
          alt="Post image"
          className="mt-4 rounded-lg w-full object-cover max-h-96"
          data-testid="post-image"
        />
      )}

      {post.mediaUrls && post.mediaUrls.length > 0 && (
        <div className={`mt-4 grid gap-2 ${post.mediaUrls.length === 1 ? 'grid-cols-1' : post.mediaUrls.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
          {post.mediaUrls.map((url: string, index: number) => (
            <img
              key={index}
              src={url}
              alt={`Post image ${index + 1}`}
              className="rounded-lg w-full object-cover h-64"
              data-testid={`post-image-${index}`}
            />
          ))}
        </div>
      )}

      {post.videoUrl && (
        <div className="mt-4">
          <VideoPlayer
            src={post.videoUrl}
            isReel={post.category === 'reel'}
            data-testid="post-video"
          />
        </div>
      )}

      {post.tags && post.tags.length > 0 && (
        <div className="flex gap-2 mt-3 flex-wrap">
          {post.tags.map((tag: string) => (
            <Badge key={tag} variant="outline" className="text-xs">
              #{tag}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
