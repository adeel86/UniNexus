import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Upload, FileText, Trash2, Download, Plus, BookOpen, Users, MessageSquare, GraduationCap, Loader2, FolderOpen, CheckCircle, Clock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";
import type { TeacherContent, Course, StudentCourse } from "@shared/schema";

interface TeacherContentUploadProps {
  teacherId: string;
}

type CourseWithStats = Course & {
  discussionCount: number;
  enrollmentCount: number;
};

type PendingValidation = StudentCourse & {
  student: {
    id: string;
    displayName: string;
    firstName: string;
    lastName: string;
    profileImageUrl: string;
    university: string;
  };
};

export function TeacherContentUpload({ teacherId }: TeacherContentUploadProps) {
  const { toast } = useToast();
  const { userData } = useAuth();
  
  // Material upload state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  
  // Course creation state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [courseName, setCourseName] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [courseDescription, setCourseDescription] = useState("");
  const [courseSemester, setCourseSemester] = useState("");
  const [courseUniversity, setCourseUniversity] = useState("");

  // Fetch teacher's courses
  const { data: createdCourses = [], isLoading: coursesLoading } = useQuery<CourseWithStats[]>({
    queryKey: ["/api/me/created-courses"],
    enabled: userData?.role === 'teacher',
  });

  // Fetch teacher's content
  const { data: teacherContent = [] } = useQuery<TeacherContent[]>({
    queryKey: [`/api/teacher-content/teacher/${teacherId}`],
  });

  // Fetch pending validations
  const { data: pendingValidations = [] } = useQuery<PendingValidation[]>({
    queryKey: ["/api/teacher/pending-validations"],
    enabled: userData?.role === 'teacher',
  });

  // Create course mutation
  const createCourseMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/courses", {
        name: courseName,
        code: courseCode,
        description: courseDescription || null,
        semester: courseSemester || null,
        university: courseUniversity || userData?.university || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/me/created-courses"] });
      toast({
        title: "Course created successfully!",
        description: "You can now upload materials to this course.",
      });
      setCreateModalOpen(false);
      resetCourseForm();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create course",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  // Upload content mutation
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
      if (selectedCourseId) {
        formData.append("courseId", selectedCourseId);
      }

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
      resetUploadForm();
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

  // Delete content mutation
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

  // Validate student course mutation
  const validateMutation = useMutation({
    mutationFn: async ({ id, note }: { id: string; note?: string }) => {
      return apiRequest("POST", `/api/student-courses/${id}/validate`, {
        validationNote: note,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teacher/pending-validations"] });
      toast({
        title: "Course validated!",
        description: "Student has been auto-enrolled and can now access AI tutoring.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Validation failed",
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

  const resetUploadForm = () => {
    setTitle("");
    setDescription("");
    setTags("");
    setSelectedFile(null);
    setIsPublic(true);
    setSelectedCourseId("");
  };

  const resetCourseForm = () => {
    setCourseName("");
    setCourseCode("");
    setCourseDescription("");
    setCourseSemester("");
    setCourseUniversity("");
  };

  const handleCreateCourse = () => {
    if (!courseName.trim() || !courseCode.trim()) {
      toast({
        title: "Missing required fields",
        description: "Please enter both course name and code",
        variant: "destructive",
      });
      return;
    }
    createCourseMutation.mutate();
  };

  // Group content by course
  const contentByCourse = teacherContent.reduce((acc, content) => {
    const courseId = content.courseId || 'uncategorized';
    if (!acc[courseId]) {
      acc[courseId] = [];
    }
    acc[courseId].push(content);
    return acc;
  }, {} as Record<string, TeacherContent[]>);

  return (
    <div className="space-y-6">
      <Tabs defaultValue="courses" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="courses" data-testid="tab-my-courses">
            <GraduationCap className="h-4 w-4 mr-2" />
            Courses
          </TabsTrigger>
          <TabsTrigger value="upload" data-testid="tab-upload">
            <Upload className="h-4 w-4 mr-2" />
            Upload
          </TabsTrigger>
          <TabsTrigger value="validations" data-testid="tab-validations">
            <CheckCircle className="h-4 w-4 mr-2" />
            Validations
            {pendingValidations.length > 0 && (
              <Badge variant="destructive" className="ml-2 text-xs">
                {pendingValidations.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Courses Tab */}
        <TabsContent value="courses" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-4">
              <div className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-purple-600" />
                <CardTitle>My Courses</CardTitle>
              </div>
              <Button
                onClick={() => setCreateModalOpen(true)}
                data-testid="button-create-course"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Course
              </Button>
            </CardHeader>
            <CardContent>
              {coursesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : createdCourses.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">You haven't created any courses yet</p>
                  <p className="text-xs mt-1">
                    Create a course to upload materials and enable AI tutoring
                  </p>
                </div>
              ) : (
                <Accordion type="single" collapsible className="w-full">
                  {createdCourses.map((course) => {
                    const courseMaterials = contentByCourse[course.id] || [];
                    return (
                      <AccordionItem key={course.id} value={course.id}>
                        <AccordionTrigger className="hover:no-underline">
                          <div className="flex items-center gap-3 flex-1">
                            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center flex-shrink-0">
                              <BookOpen className="h-5 w-5 text-white" />
                            </div>
                            <div className="text-left">
                              <h3 className="font-semibold">{course.name}</h3>
                              <div className="flex items-center gap-2 flex-wrap mt-1">
                                <Badge variant="secondary" className="text-xs">
                                  {course.code}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {courseMaterials.length} materials
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  <Users className="h-3 w-3 inline mr-1" />
                                  {course.enrollmentCount} enrolled
                                </span>
                              </div>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="pt-4 space-y-4">
                            {course.description && (
                              <p className="text-sm text-muted-foreground">
                                {course.description}
                              </p>
                            )}
                            
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                asChild
                                data-testid={`link-course-${course.id}`}
                              >
                                <Link href={`/courses/${course.id}`}>
                                  <MessageSquare className="h-4 w-4 mr-2" />
                                  View Discussions
                                </Link>
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => {
                                  setSelectedCourseId(course.id);
                                  const tabElement = document.querySelector('[data-testid="tab-upload"]');
                                  if (tabElement instanceof HTMLElement) {
                                    tabElement.click();
                                  }
                                }}
                                data-testid={`button-upload-to-${course.id}`}
                              >
                                <Upload className="h-4 w-4 mr-2" />
                                Upload Material
                              </Button>
                            </div>

                            {courseMaterials.length > 0 && (
                              <div className="border-t pt-4 mt-4">
                                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                                  <FolderOpen className="h-4 w-4" />
                                  Course Materials
                                </h4>
                                <div className="space-y-2">
                                  {courseMaterials.map((content) => (
                                    <div
                                      key={content.id}
                                      className="flex items-center justify-between p-2 border rounded-md"
                                      data-testid={`material-${content.id}`}
                                    >
                                      <div className="flex items-center gap-2">
                                        <FileText className="h-4 w-4 text-primary" />
                                        <span className="text-sm">{content.title}</span>
                                      </div>
                                      <div className="flex gap-1">
                                        {content.fileUrl && (
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            asChild
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
                                        >
                                          <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Upload Tab */}
        <TabsContent value="upload" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Upload Course Materials</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="course-select">Select Course</Label>
                <Select
                  value={selectedCourseId}
                  onValueChange={setSelectedCourseId}
                >
                  <SelectTrigger id="course-select" data-testid="select-upload-course">
                    <SelectValue placeholder="Choose a course (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No specific course</SelectItem>
                    {createdCourses.map((course) => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.code} - {course.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Materials linked to a course enable AI tutoring for enrolled students
                </p>
              </div>

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

          {/* All uploaded materials */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>All Uploaded Materials</CardTitle>
            </CardHeader>
            <CardContent>
              {teacherContent.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No materials uploaded yet. Upload your first document above!
                </p>
              ) : (
                <div className="space-y-2">
                  {teacherContent.map((content) => {
                    const linkedCourse = createdCourses.find(c => c.id === content.courseId);
                    return (
                      <div
                        key={content.id}
                        className="flex items-center justify-between p-3 border rounded-md hover-elevate"
                        data-testid={`content-item-${content.id}`}
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <FileText className="h-5 w-5 text-primary" />
                          <div className="flex-1">
                            <h4 className="font-medium">{content.title}</h4>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              {linkedCourse && (
                                <Badge variant="secondary" className="text-xs">
                                  {linkedCourse.code}
                                </Badge>
                              )}
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
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Validations Tab */}
        <TabsContent value="validations" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-orange-500" />
                <CardTitle>Pending Course Validations</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {pendingValidations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No pending validation requests</p>
                  <p className="text-xs mt-1">
                    Students will appear here when they request course validation
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingValidations.map((validation) => (
                    <div
                      key={validation.id}
                      className="border rounded-md p-4"
                      data-testid={`validation-${validation.id}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                          {validation.student.profileImageUrl ? (
                            <img
                              src={validation.student.profileImageUrl}
                              alt={validation.student.displayName}
                              className="h-10 w-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="text-sm font-medium">
                                {validation.student.firstName?.[0]}{validation.student.lastName?.[0]}
                              </span>
                            </div>
                          )}
                          <div>
                            <p className="font-medium">
                              {validation.student.firstName} {validation.student.lastName}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {validation.student.university || "No institution"}
                            </p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => validateMutation.mutate({ id: validation.id })}
                          disabled={validateMutation.isPending}
                          data-testid={`button-validate-${validation.id}`}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Validate & Enroll
                        </Button>
                      </div>
                      <div className="mt-3 pl-13">
                        <p className="text-sm font-medium">{validation.courseName}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {validation.courseCode && (
                            <Badge variant="secondary" className="text-xs">
                              {validation.courseCode}
                            </Badge>
                          )}
                          {validation.semester && (
                            <span className="text-xs text-muted-foreground">
                              {validation.semester}
                            </span>
                          )}
                        </div>
                        {validation.description && (
                          <p className="text-xs text-muted-foreground mt-2">
                            {validation.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Course Modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl">
              <GraduationCap className="inline-block mr-2 h-6 w-6" />
              Create New Course
            </DialogTitle>
            <DialogDescription>
              Create a course that students can enroll in. They will have access to AI tutoring based on your uploaded materials.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            <div>
              <Label htmlFor="course-name">Course Name *</Label>
              <Input
                id="course-name"
                placeholder="e.g., Introduction to Computer Science"
                value={courseName}
                onChange={(e) => setCourseName(e.target.value)}
                data-testid="input-course-name"
              />
            </div>

            <div>
              <Label htmlFor="course-code">Course Code *</Label>
              <Input
                id="course-code"
                placeholder="e.g., CS101"
                value={courseCode}
                onChange={(e) => setCourseCode(e.target.value)}
                data-testid="input-course-code"
              />
            </div>

            <div>
              <Label htmlFor="course-description">Description</Label>
              <Textarea
                id="course-description"
                placeholder="Describe what this course covers..."
                value={courseDescription}
                onChange={(e) => setCourseDescription(e.target.value)}
                rows={3}
                data-testid="textarea-course-description"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="course-semester">Semester</Label>
                <Select
                  value={courseSemester}
                  onValueChange={setCourseSemester}
                >
                  <SelectTrigger id="course-semester" data-testid="select-course-semester">
                    <SelectValue placeholder="Select semester" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Spring 2025">Spring 2025</SelectItem>
                    <SelectItem value="Summer 2025">Summer 2025</SelectItem>
                    <SelectItem value="Fall 2025">Fall 2025</SelectItem>
                    <SelectItem value="Winter 2025">Winter 2025</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="course-university">University</Label>
                <Input
                  id="course-university"
                  placeholder={userData?.university || "e.g., MIT"}
                  value={courseUniversity}
                  onChange={(e) => setCourseUniversity(e.target.value)}
                  data-testid="input-course-university"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setCreateModalOpen(false);
                  resetCourseForm();
                }}
                data-testid="button-cancel-create-course"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateCourse}
                disabled={!courseName.trim() || !courseCode.trim() || createCourseMutation.isPending}
                data-testid="button-submit-create-course"
              >
                {createCourseMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Course"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
