import type { User } from "@shared/schema";
import type { CertificateFormState } from "./useTeacherDashboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Shield } from "lucide-react";
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

interface CertificateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: User | null;
  form: CertificateFormState;
  onFormChange: (form: CertificateFormState) => void;
  onSubmit: () => void;
  isPending: boolean;
}

export function CertificateModal({
  open,
  onOpenChange,
  student,
  form,
  onFormChange,
  onSubmit,
  isPending,
}: CertificateModalProps) {
  const updateField = <K extends keyof CertificateFormState>(
    field: K,
    value: CertificateFormState[K]
  ) => {
    onFormChange({ ...form, [field]: value });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl">
            <Shield className="inline-block mr-2 h-6 w-6" />
            Issue Digital Certificate to {student?.firstName} {student?.lastName}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-4 pr-4">
            <div>
              <Label htmlFor="cert-type">Certificate Type</Label>
              <Select value={form.type} onValueChange={(v) => updateField("type", v)}>
                <SelectTrigger id="cert-type" data-testid="select-cert-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="course_completion">Course Completion</SelectItem>
                  <SelectItem value="project">Project Achievement</SelectItem>
                  <SelectItem value="skill_endorsement">Skill Endorsement</SelectItem>
                  <SelectItem value="achievement">Special Achievement</SelectItem>
                  <SelectItem value="custom">Custom Certificate</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="cert-title">Title *</Label>
              <Input
                id="cert-title"
                placeholder="e.g., Advanced Web Development Certificate"
                value={form.title}
                onChange={(e) => updateField("title", e.target.value)}
                data-testid="input-cert-title"
              />
            </div>

            <div>
              <Label htmlFor="cert-description">Description *</Label>
              <Textarea
                id="cert-description"
                placeholder="Describe the achievement or completion criteria..."
                value={form.description}
                onChange={(e) => updateField("description", e.target.value)}
                className="min-h-[80px]"
                data-testid="textarea-cert-description"
              />
            </div>

            <div>
              <Label htmlFor="cert-metadata">Metadata (JSON, optional)</Label>
              <Textarea
                id="cert-metadata"
                placeholder='{"grade": "A", "completionDate": "2024-01-15"}'
                value={form.metadata}
                onChange={(e) => updateField("metadata", e.target.value)}
                className="min-h-[60px] font-mono text-sm"
                data-testid="textarea-cert-metadata"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Optional JSON data for additional certificate details
              </p>
            </div>

            <div>
              <Label htmlFor="cert-image">Image URL (optional)</Label>
              <Input
                id="cert-image"
                placeholder="https://example.com/certificate-badge.png"
                value={form.imageUrl}
                onChange={(e) => updateField("imageUrl", e.target.value)}
                data-testid="input-cert-image"
              />
            </div>

            <div>
              <Label htmlFor="cert-expires">Expires At (optional)</Label>
              <Input
                id="cert-expires"
                type="date"
                value={form.expiresAt}
                onChange={(e) => updateField("expiresAt", e.target.value)}
                data-testid="input-cert-expires"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel-certificate"
              >
                Cancel
              </Button>
              <Button
                onClick={onSubmit}
                disabled={!form.title.trim() || !form.description.trim() || isPending}
                data-testid="button-submit-certificate"
              >
                {isPending ? "Issuing..." : "Issue Certificate"}
              </Button>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
