import { useState, useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { UserAvatar } from "@/components/UserAvatar";
import { Upload, Loader2, Link as LinkIcon } from "lucide-react";
import type { User } from "@shared/schema";

interface EditProfileModalProps {
  user: User;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditProfileModal({ user, open, onOpenChange }: EditProfileModalProps) {
  const { toast } = useToast();
  const [bio, setBio] = useState(user.bio || "");
  const [profileImageUrl, setProfileImageUrl] = useState(user.profileImageUrl || "");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setBio(user.bio || "");
      setProfileImageUrl(user.profileImageUrl || "");
    }
  }, [open, user.bio, user.profileImageUrl]);

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("image", file);
      const response = await apiRequest("POST", "/api/upload/image", formData);
      return response.json();
    },
    onSuccess: (data) => {
      setProfileImageUrl(data.url);
      toast({
        title: "Image uploaded",
        description: "Your profile picture has been updated in the preview.",
      });
    },
    onError: () => {
      toast({
        title: "Upload failed",
        description: "Could not upload profile picture. Please try again.",
        variant: "destructive",
      });
    },
    onSettled: () => setIsUploading(false),
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast({
          title: "Invalid file",
          description: "Please select an image file (jpg, png, webp).",
          variant: "destructive",
        });
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Image size must be less than 10MB.",
          variant: "destructive",
        });
        return;
      }
      setIsUploading(true);
      uploadMutation.mutate(file);
    }
  };

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("PATCH", `/api/users/${user.id}/profile`, {
        bio: bio.trim() || null,
        profileImageUrl: profileImageUrl.trim() || null,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", user.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/me"] });
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">Edit Profile</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex flex-col items-center gap-6">
            <div className="relative group">
              <UserAvatar 
                user={{ ...user, profileImageUrl: profileImageUrl || user.profileImageUrl }} 
                size="xl" 
                className="ring-4 ring-primary/10"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 flex items-center justify-center bg-black/40 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                disabled={isUploading}
              >
                {isUploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Upload className="h-6 w-6" />}
              </button>
            </div>
            
            <div className="w-full space-y-4">
              <div className="flex flex-col gap-2">
                <Label>Profile Picture</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 gap-2"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    <Upload className="h-4 w-4" />
                    Upload Photo
                  </Button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="profileImageUrl">Image URL (Optional)</Label>
                  <LinkIcon className="h-3 w-3 text-muted-foreground" />
                </div>
                <Input
                  id="profileImageUrl"
                  placeholder="https://example.com/your-photo.jpg"
                  value={profileImageUrl}
                  onChange={(e) => setProfileImageUrl(e.target.value)}
                  data-testid="input-profile-image-url"
                />
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              placeholder="Tell us about yourself..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="min-h-[120px] mt-2"
              maxLength={500}
              data-testid="textarea-bio"
            />
            <p className="text-xs text-muted-foreground mt-1 text-right">
              {bio.length}/500 characters
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              data-testid="button-cancel-edit"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={updateProfileMutation.isPending || isUploading}
              data-testid="button-save-profile"
            >
              {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
