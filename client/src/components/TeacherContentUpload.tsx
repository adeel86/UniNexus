import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Upload, FileText, Trash2, Download } from "lucide-react";
import type { TeacherContent } from "@shared/schema";

interface TeacherContentUploadProps {
  teacherId: string;
}

export function TeacherContentUpload({ teacherId }: TeacherContentUploadProps) {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const { data: teacherContent = [] } = useQuery<TeacherContent[]>({
    queryKey: [`/api/teacher-content/teacher/${teacherId}`],
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile) {
        throw new Error("Please select a file");
      }

      setIsUploading(true);
      const formData = new FormData();
      formData.append("document", selectedFile);
      formData.append("title", title || selectedFile.name);
      formData.append("description", description);
      formData.append("tags", tags);
      formData.append("isPublic", isPublic.toString());

      const response = await fetch("/api/teacher-content/upload", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/teacher-content/teacher/${teacherId}`] });
      toast({ title: "Content uploaded successfully!" });
      setTitle("");
      setDescription("");
      setTags("");
      setSelectedFile(null);
      setIsPublic(true);
    },
    onError: (error: any) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsUploading(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (contentId: string) => {
      const response = await fetch(`/api/teacher-content/${contentId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Delete failed");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/teacher-content/teacher/${teacherId}`] });
      toast({ title: "Content deleted successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Upload Course Materials</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="file-upload">Document File</Label>
            <div className="flex gap-2 mt-1">
              <Input
                id="file-upload"
                type="file"
                accept=".pdf,.doc,.docx,.txt,.ppt,.pptx"
                onChange={handleFileSelect}
                data-testid="input-file-upload"
              />
              {selectedFile && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedFile(null)}
                  data-testid="button-clear-file"
                >
                  Clear
                </Button>
              )}
            </div>
            {selectedFile && (
              <p className="text-sm text-muted-foreground mt-1">
                Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="content-title">Title</Label>
            <Input
              id="content-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Week 1 Lecture Notes"
              data-testid="input-content-title"
            />
          </div>

          <div>
            <Label htmlFor="content-description">Description</Label>
            <Textarea
              id="content-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this material..."
              data-testid="textarea-content-description"
            />
          </div>

          <div>
            <Label htmlFor="content-tags">Tags</Label>
            <Input
              id="content-tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g., lecture, notes, assignment"
              data-testid="input-content-tags"
            />
            <p className="text-xs text-muted-foreground mt-1">Separate with commas</p>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id="public-switch"
              checked={isPublic}
              onCheckedChange={setIsPublic}
              data-testid="switch-is-public"
            />
            <Label htmlFor="public-switch">Make public to all students</Label>
          </div>

          <Button
            onClick={() => uploadMutation.mutate()}
            disabled={!selectedFile || isUploading}
            className="w-full"
            data-testid="button-upload-content"
          >
            <Upload className="mr-2 h-4 w-4" />
            {isUploading ? "Uploading..." : "Upload Content"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your Uploaded Materials</CardTitle>
        </CardHeader>
        <CardContent>
          {teacherContent.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No materials uploaded yet. Upload your first document above!
            </p>
          ) : (
            <div className="space-y-2">
              {teacherContent.map((content) => (
                <div
                  key={content.id}
                  className="flex items-center justify-between p-3 border rounded-md hover-elevate"
                  data-testid={`content-item-${content.id}`}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <FileText className="h-5 w-5 text-primary" />
                    <div className="flex-1">
                      <h4 className="font-medium">{content.title}</h4>
                      {content.description && (
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {content.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {content.uploadedAt ? new Date(content.uploadedAt).toLocaleDateString() : "N/A"}
                        </span>
                        {content.tags && content.tags.length > 0 && (
                          <div className="flex gap-1">
                            {content.tags.slice(0, 3).map((tag, i) => (
                              <span key={i} className="text-xs bg-muted px-2 py-0.5 rounded">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {content.fileUrl && (
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        data-testid={`button-download-${content.id}`}
                      >
                        <a href={content.fileUrl} download target="_blank" rel="noopener noreferrer">
                          <Download className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteMutation.mutate(content.id)}
                      disabled={deleteMutation.isPending}
                      data-testid={`button-delete-${content.id}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
