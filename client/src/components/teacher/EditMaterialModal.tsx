import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import type { TeacherContent } from "@shared/schema";

interface EditMaterialModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  material: TeacherContent | null;
  materialForm: {
    title: string;
    setTitle: (val: string) => void;
    description: string;
    setDescription: (val: string) => void;
    tags: string;
    setTags: (val: string) => void;
    isPublic: boolean;
    setIsPublic: (val: boolean) => void;
  };
  isPending: boolean;
  onSubmit: () => void;
}

export function EditMaterialModal({
  open,
  onOpenChange,
  material,
  materialForm,
  isPending,
  onSubmit,
}: EditMaterialModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Material</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="edit-material-title">Title</Label>
            <Input
              id="edit-material-title"
              value={materialForm.title}
              onChange={(e) => materialForm.setTitle(e.target.value)}
              data-testid="input-edit-material-title"
            />
          </div>
          <div>
            <Label htmlFor="edit-material-description">Description</Label>
            <Textarea
              id="edit-material-description"
              value={materialForm.description}
              onChange={(e) => materialForm.setDescription(e.target.value)}
              data-testid="textarea-edit-material-description"
            />
          </div>
          <div>
            <Label htmlFor="edit-material-tags">Tags (comma-separated)</Label>
            <Input
              id="edit-material-tags"
              value={materialForm.tags}
              onChange={(e) => materialForm.setTags(e.target.value)}
              data-testid="input-edit-material-tags"
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="edit-material-public" className="cursor-pointer">
              Make publicly visible
            </Label>
            <Switch
              id="edit-material-public"
              checked={materialForm.isPublic}
              onCheckedChange={materialForm.setIsPublic}
              data-testid="switch-edit-material-public"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={onSubmit}
            disabled={isPending}
            data-testid="button-confirm-edit-material"
          >
            {isPending ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
