import type { User, Skill } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface EndorseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: User | null;
  skills: Skill[];
  selectedSkill: string;
  onSkillChange: (skill: string) => void;
  comment: string;
  onCommentChange: (comment: string) => void;
  onSubmit: () => void;
  isPending: boolean;
}

export function EndorseModal({
  open,
  onOpenChange,
  student,
  skills,
  selectedSkill,
  onSkillChange,
  comment,
  onCommentChange,
  onSubmit,
  isPending,
}: EndorseModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl">
            Endorse {student?.firstName} {student?.lastName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="skill">Skill (Optional)</Label>
            <Select value={selectedSkill} onValueChange={onSkillChange}>
              <SelectTrigger id="skill" data-testid="select-skill">
                <SelectValue placeholder="Select a skill" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General Endorsement</SelectItem>
                {skills.map((skill) => (
                  <SelectItem key={skill.id} value={skill.id}>
                    {skill.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="comment">Comment</Label>
            <Textarea
              id="comment"
              placeholder="Share why you're endorsing this student..."
              value={comment}
              onChange={(e) => onCommentChange(e.target.value)}
              className="min-h-[100px]"
              data-testid="textarea-endorsement-comment"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              data-testid="button-cancel-endorsement"
            >
              Cancel
            </Button>
            <Button
              onClick={onSubmit}
              disabled={!comment.trim() || isPending}
              data-testid="button-submit-endorsement"
            >
              {isPending ? "Sending..." : "Send Endorsement"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
