import { useState, useEffect } from "react";
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

  useEffect(() => {
    if (open) {
      setBio(user.bio || "");
      setProfileImageUrl(user.profileImageUrl || "");
    }
  }, [open, user.bio, user.profileImageUrl]);

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
          <div className="flex flex-col items-center gap-4">
            <UserAvatar 
              user={{ ...user, profileImageUrl: profileImageUrl || user.profileImageUrl }} 
              size="xl" 
            />
            <div className="w-full">
              <Label htmlFor="profileImageUrl">Profile Image URL</Label>
              <Input
                id="profileImageUrl"
                placeholder="https://example.com/your-photo.jpg"
                value={profileImageUrl}
                onChange={(e) => setProfileImageUrl(e.target.value)}
                className="mt-2"
                data-testid="input-profile-image-url"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Enter a URL to an image (recommended size: 200x200px)
              </p>
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
              disabled={updateProfileMutation.isPending}
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
