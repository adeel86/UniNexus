import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useState, useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ImagePlus, Video, X, Loader2 } from "lucide-react";
import { VideoPlayer } from "@/components/VideoPlayer";

interface CreatePostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialContent?: string;
  initialCategory?: string;
  initialTags?: string;
}

export function CreatePostModal({ 
  open, 
  onOpenChange,
  initialContent = "",
  initialCategory = "social",
  initialTags = ""
}: CreatePostModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [content, setContent] = useState(initialContent);
  const [category, setCategory] = useState(initialCategory);
  const [tags, setTags] = useState(initialTags);
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setContent(initialContent);
      setCategory(initialCategory);
      setTags(initialTags);
      setMediaUrls([]);
      setVideoUrl("");
    }
  }, [open, initialContent, initialCategory, initialTags]);

  const uploadImages = async (files: FileList) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      Array.from(files).forEach(file => {
        formData.append('images', file);
      });

      const response = await fetch('/api/upload/images', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload images');
      }

      const data = await response.json();
      setMediaUrls(prev => [...prev, ...data.urls]);
      toast({ title: "Images uploaded successfully!" });
    } catch (error) {
      toast({
        title: "Failed to upload images",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const uploadVideo = async (file: File) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('video', file);

      const response = await fetch('/api/upload/video', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload video');
      }

      const data = await response.json();
      setVideoUrl(data.url);
      toast({ title: "Video uploaded successfully!" });
    } catch (error) {
      toast({
        title: "Failed to upload video",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      uploadImages(e.target.files);
    }
  };

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      uploadVideo(e.target.files[0]);
    }
  };

  const removeImage = (index: number) => {
    setMediaUrls(prev => prev.filter((_, i) => i !== index));
  };

  const removeVideo = () => {
    setVideoUrl("");
  };

  const createPostMutation = useMutation({
    mutationFn: async () => {
      // First moderate the content
      try {
        const moderationResponse = await apiRequest("POST", "/api/ai/moderate-content", { content });
        const moderation = await moderationResponse.json() as { approved: boolean; reason: string; confidence: number };
        
        if (!moderation.approved) {
          throw new Error(moderation.reason || "Your post contains content that doesn't meet our community guidelines.");
        }
      } catch (error) {
        if (error instanceof Error) {
          throw error;
        }
        throw new Error("Failed to verify content safety. Please try again.");
      }

      // If moderation passes, create the post
      return apiRequest("POST", "/api/posts", {
        content,
        category,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        mediaUrls,
        videoUrl: videoUrl || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/feed/personalized"] });
      queryClient.invalidateQueries({ queryKey: ["/api/feed/following"] });
      toast({ title: "Post created successfully!" });
      setContent("");
      setCategory("social");
      setTags("");
      setMediaUrls([]);
      setVideoUrl("");
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create post",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl">Create a Post</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="category">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="category" data-testid="select-category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="academic">Academic</SelectItem>
                <SelectItem value="social">Social</SelectItem>
                <SelectItem value="project">Project</SelectItem>
                <SelectItem value="achievement">Achievement</SelectItem>
                <SelectItem value="reel">Reel (Short Video)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="content">What's on your mind?</Label>
            <Textarea
              id="content"
              placeholder="Share your thoughts, achievements, or ask questions..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[150px]"
              data-testid="textarea-content"
            />
          </div>

          <div>
            <Label htmlFor="tags">Tags (comma-separated)</Label>
            <Input
              id="tags"
              placeholder="e.g., javascript, react, webdev"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              data-testid="input-tags"
            />
          </div>

          {/* Image Previews */}
          {mediaUrls.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {mediaUrls.map((url, index) => (
                <div key={index} className="relative group">
                  <img
                    src={url}
                    alt={`Upload ${index + 1}`}
                    className="w-full h-32 object-cover rounded-md"
                  />
                  <Button
                    size="icon"
                    variant="destructive"
                    className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeImage(index)}
                    data-testid={`button-remove-image-${index}`}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Video Preview */}
          {videoUrl && (
            <div className="relative group">
              <VideoPlayer
                src={videoUrl}
                className="max-h-80"
                isReel={category === "reel"}
              />
              <Button
                size="icon"
                variant="destructive"
                className="absolute top-2 right-2 h-8 w-8"
                onClick={removeVideo}
                data-testid="button-remove-video"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Upload Buttons */}
          <div className="flex gap-3">
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageSelect}
              className="hidden"
            />
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => imageInputRef.current?.click()}
              disabled={isUploading || videoUrl !== ""}
              data-testid="button-add-image"
            >
              <ImagePlus className="h-4 w-4" />
              {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add Images"}
            </Button>

            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              onChange={handleVideoSelect}
              className="hidden"
            />
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => videoInputRef.current?.click()}
              disabled={isUploading || videoUrl !== "" || mediaUrls.length > 0}
              data-testid="button-add-video"
            >
              <Video className="h-4 w-4" />
              {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add Video"}
            </Button>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              onClick={() => createPostMutation.mutate()}
              disabled={!content.trim() || createPostMutation.isPending || isUploading}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              data-testid="button-submit"
            >
              {createPostMutation.isPending ? "Posting..." : "Post"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
