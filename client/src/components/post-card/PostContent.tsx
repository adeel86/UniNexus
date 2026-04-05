import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { VideoPlayer } from "@/components/VideoPlayer";
import { ImageViewer } from "@/components/ImageViewer";
import { UserAvatar } from "@/components/UserAvatar";
import { X } from "lucide-react";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
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
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const allImages = post.mediaUrls && post.mediaUrls.length > 0
    ? post.mediaUrls
    : (post.imageUrl ? [post.imageUrl] : []);

  const handleImageClick = (url: string, index: number) => {
    setSelectedImage(url);
    setSelectedImageIndex(index);
  };

  const handleNext = () => {
    if (selectedImageIndex < allImages.length - 1) {
      const nextIndex = selectedImageIndex + 1;
      setSelectedImage(allImages[nextIndex]);
      setSelectedImageIndex(nextIndex);
    }
  };

  const handlePrev = () => {
    if (selectedImageIndex > 0) {
      const prevIndex = selectedImageIndex - 1;
      setSelectedImage(allImages[prevIndex]);
      setSelectedImageIndex(prevIndex);
    }
  };

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
        <>
          {post.content && (
            <p className="text-base leading-relaxed whitespace-pre-wrap mb-3">{post.content}</p>
          )}
          {post.originalPostId && (
            <div className="border rounded-xl p-4 bg-muted/30 space-y-3">
              {post.originalPost ? (
                <>
                  <div className="flex items-center gap-2">
                    <UserAvatar user={post.originalPost.author} size="sm" />
                    <div>
                      <p className="font-semibold text-sm leading-tight">
                        {post.originalPost.author.firstName} {post.originalPost.author.lastName}
                      </p>
                      {post.originalPost.createdAt && (
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(post.originalPost.createdAt), { addSuffix: true })}
                        </p>
                      )}
                    </div>
                  </div>
                  {post.originalPost.content && (
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{post.originalPost.content}</p>
                  )}
                  {post.originalPost.imageUrl && (
                    <img
                      src={post.originalPost.imageUrl}
                      alt="Original post image"
                      className="rounded-lg w-full object-cover max-h-64"
                    />
                  )}
                  {post.originalPost.mediaUrls && post.originalPost.mediaUrls.length > 0 && (
                    <div className={`grid gap-2 ${post.originalPost.mediaUrls.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                      {post.originalPost.mediaUrls.slice(0, 4).map((url: string, index: number) => (
                        <img
                          key={index}
                          src={url}
                          alt={`Original post image ${index + 1}`}
                          className="rounded-lg w-full object-cover h-40"
                        />
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  The original post is no longer available.
                </p>
              )}
            </div>
          )}
        </>
      )}
      
      {!post.originalPostId && post.imageUrl && (
        <img
          src={post.imageUrl}
          alt="Post image"
          className="mt-4 rounded-lg w-full object-cover max-h-96 cursor-pointer hover:opacity-90 transition-opacity"
          onClick={() => handleImageClick(post.imageUrl!, 0)}
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
              className="rounded-lg w-full object-cover h-64 cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => handleImageClick(url, index)}
              data-testid={`post-image-${index}`}
            />
          ))}
        </div>
      )}

      {/* Image Viewer Modal */}
      <ImageViewer
        src={selectedImage || ""}
        alt="Post image"
        isOpen={selectedImage !== null}
        onClose={() => setSelectedImage(null)}
        onNext={handleNext}
        onPrev={handlePrev}
        hasNext={selectedImageIndex < allImages.length - 1}
        hasPrev={selectedImageIndex > 0}
      />

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
