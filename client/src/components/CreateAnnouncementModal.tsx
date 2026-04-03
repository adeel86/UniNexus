import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/AuthContext";
import { Loader2 } from "lucide-react";

interface CreateAnnouncementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateAnnouncementModal({ open, onOpenChange }: CreateAnnouncementModalProps) {
  const { toast } = useToast();
  const { userData } = useAuth();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isPinned, setIsPinned] = useState(false);

  const createMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/announcements", {
        title,
        content,
        isPinned,
        universityId: userData?.universityId || "",
      });
    },
    onSuccess: () => {
      toast({
        title: "Announcement created",
        description: "Your announcement has been posted to all students",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/announcements"] });
      setTitle("");
      setContent("");
      setIsPinned(false);
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create announcement",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast({
        title: "Missing title",
        description: "Please enter an announcement title",
        variant: "destructive",
      });
      return;
    }
    createMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Announcement</DialogTitle>
          <DialogDescription>
            Share important information with all students in your university
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Title</label>
            <Input
              placeholder="e.g., Spring Registration Now Open"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={createMutation.isPending}
              data-testid="input-announcement-title"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Content</label>
            <Textarea
              placeholder="Enter the announcement content..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={createMutation.isPending}
              rows={4}
              data-testid="input-announcement-content"
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="pin"
              checked={isPinned}
              onCheckedChange={(checked) => setIsPinned(!!checked)}
              disabled={createMutation.isPending}
              data-testid="checkbox-pin-announcement"
            />
            <label htmlFor="pin" className="text-sm font-medium cursor-pointer">
              Pin this announcement to the top
            </label>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending}
              data-testid="button-submit-announcement"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Announcement"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
