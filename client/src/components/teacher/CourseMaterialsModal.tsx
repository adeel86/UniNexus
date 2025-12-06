import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Upload, FileText, Trash2, Download, Loader2, Pencil } from "lucide-react";
import type { TeacherContent } from "@shared/schema";
import type { CourseWithStats } from "./useTeacherContent";

interface CourseMaterialsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  course: CourseWithStats | null;
  materials: TeacherContent[];
  uploadForm: {
    title: string;
    setTitle: (val: string) => void;
    description: string;
    setDescription: (val: string) => void;
    tags: string;
    setTags: (val: string) => void;
    isPublic: boolean;
    setIsPublic: (val: boolean) => void;
    selectedFile: File | null;
    isUploading: boolean;
    handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  };
  isUploadPending: boolean;
  onUpload: () => void;
  onDeleteMaterial: (id: string) => void;
  onEditMaterial: (material: TeacherContent) => void;
}

export function CourseMaterialsModal({
  open,
  onOpenChange,
  course,
  materials,
  uploadForm,
  isUploadPending,
  onUpload,
  onDeleteMaterial,
  onEditMaterial,
}: CourseMaterialsModalProps) {

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Course Materials</DialogTitle>
          {course && (
            <DialogDescription>
              {course.name} ({course.code})
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-6">
          <div className="border rounded-md p-4 space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Upload New Material
            </h4>

            <div>
              <Label htmlFor="material-file">Select File</Label>
              <Input
                id="material-file"
                type="file"
                accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.md"
                onChange={uploadForm.handleFileSelect}
                data-testid="input-material-file"
              />
              {uploadForm.selectedFile && (
                <p className="text-sm text-muted-foreground mt-1">
                  Selected: {uploadForm.selectedFile.name}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="material-title">Title</Label>
              <Input
                id="material-title"
                value={uploadForm.title}
                onChange={(e) => uploadForm.setTitle(e.target.value)}
                placeholder="Material title (optional, uses filename if empty)"
                data-testid="input-material-title"
              />
            </div>

            <div>
              <Label htmlFor="material-description">Description</Label>
              <Textarea
                id="material-description"
                value={uploadForm.description}
                onChange={(e) => uploadForm.setDescription(e.target.value)}
                placeholder="Brief description of this material"
                data-testid="textarea-material-description"
              />
            </div>

            <div>
              <Label htmlFor="material-tags">Tags (comma-separated)</Label>
              <Input
                id="material-tags"
                value={uploadForm.tags}
                onChange={(e) => uploadForm.setTags(e.target.value)}
                placeholder="e.g., lecture, notes, chapter-1"
                data-testid="input-material-tags"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="material-public" className="cursor-pointer">
                Make publicly visible to enrolled students
              </Label>
              <Switch
                id="material-public"
                checked={uploadForm.isPublic}
                onCheckedChange={uploadForm.setIsPublic}
                data-testid="switch-material-public"
              />
            </div>

            <Button
              onClick={onUpload}
              disabled={!uploadForm.selectedFile || isUploadPending || uploadForm.isUploading}
              className="w-full"
              data-testid="button-upload-material"
            >
              {isUploadPending || uploadForm.isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Material
                </>
              )}
            </Button>
          </div>

          <div>
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Existing Materials ({materials.length})
            </h4>

            {materials.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No materials uploaded yet
              </p>
            ) : (
              <div className="space-y-2">
                {materials.map((material) => (
                  <div
                    key={material.id}
                    className="border rounded-md p-3 flex items-center justify-between gap-2"
                    data-testid={`material-item-${material.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium truncate">{material.title}</p>
                        {!material.isPublic && (
                          <Badge variant="secondary" className="text-xs">Private</Badge>
                        )}
                      </div>
                      {material.uploadedAt && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(material.uploadedAt).toLocaleDateString()}
                        </p>
                      )}
                      {material.tags && material.tags.length > 0 && (
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {material.tags.slice(0, 3).map((tag, i) => (
                            <Badge key={i} variant="outline" className="text-xs">{tag}</Badge>
                          ))}
                          {material.tags.length > 3 && (
                            <Badge variant="outline" className="text-xs">+{material.tags.length - 3}</Badge>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {material.fileUrl && (
                        <Button
                          size="icon"
                          variant="ghost"
                          asChild
                          data-testid={`button-download-${material.id}`}
                        >
                          <a href={material.fileUrl} target="_blank" rel="noopener noreferrer">
                            <Download className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => onEditMaterial(material)}
                        data-testid={`button-edit-material-${material.id}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => onDeleteMaterial(material.id)}
                        className="text-destructive hover:text-destructive"
                        data-testid={`button-delete-material-${material.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
