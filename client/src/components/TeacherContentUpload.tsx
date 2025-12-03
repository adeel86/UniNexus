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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Upload, FileText, Trash2, Download, Plus, BookOpen, Users, MessageSquare, GraduationCap, Loader2, FolderOpen, CheckCircle, Clock, Edit2, Send, AlertCircle, XCircle } from "lucide-react";
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
  
  // Course creation/editing state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<CourseWithStats | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState<CourseWithStats | null>(null);
  const [courseName, setCourseName] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [courseDescription, setCourseDescription] = useState("");
  const [courseSemester, setCourseSemester] = useState("");
  const [courseUniversity, setCourseUniversity] = useState("");
  
  // Validation request state
  const [validationRequestModalOpen, setValidationRequestModalOpen] = useState(false);
  const [courseForValidation, setCourseForValidation] = useState<CourseWithStats | null>(null);
  const [validationNote, setValidationNote] = useState("");

  // Fetch teacher's courses
  const { data: createdCourses = [], isLoading: coursesLoading } = useQuery<CourseWithStats[]>({
    queryKey: ["/api/me/created-courses"],
    enabled: userData?.role === 'teacher',
  });

  // Fetch teacher's content
  const { data: teacherContent = [] } = useQuery<TeacherContent[]>({
    queryKey: [`/api/teacher-content/teacher/${teacherId}`],
  });

  // Fetch pending validations (student courses that need teacher validation)
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
        description: "Request university validation to enable content uploads.",
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

  // Update course mutation
  const updateCourseMutation = useMutation({
    mutationFn: async () => {
      if (!editingCourse) return;
      return apiRequest("PATCH", `/api/courses/${editingCourse.id}`, {
        name: courseName,
        code: courseCode,
        description: courseDescription || null,
        semester: courseSemester || null,
        university: courseUniversity || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/me/created-courses"] });
      toast({ title: "Course updated successfully!" });
      setEditModalOpen(false);
      setEditingCourse(null);
      resetCourseForm();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update course",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  // Delete course mutation
  const deleteCourseMutation = useMutation({
    mutationFn: async (courseId: string) => {
      return apiRequest("DELETE", `/api/courses/${courseId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/me/created-courses"] });
      toast({ title: "Course deleted successfully" });
      setDeleteDialogOpen(false);
      setCourseToDelete(null);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete course",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  // Request university validation mutation
  const requestValidationMutation = useMutation({
    mutationFn: async ({ courseId, note }: { courseId: string; note?: string }) => {
      return apiRequest("POST", `/api/courses/${courseId}/request-validation`, { note });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/me/created-courses"] });
      toast({
        title: "Validation request sent!",
        description: "Your university will review the course for validation.",
      });
      setValidationRequestModalOpen(false);
      setCourseForValidation(null);
      setValidationNote("");
    },
    onError: (error: any) => {
      toast({
        title: "Failed to request validation",
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
      if (selectedCourseId && selectedCourseId !== "none") {
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

  const handleUpdateCourse = () => {
    if (!courseName.trim() || !courseCode.trim()) {
      toast({
        title: "Missing required fields",
        description: "Please enter both course name and code",
        variant: "destructive",
      });
      return;
    }
    updateCourseMutation.mutate();
  };

  const openEditModal = (course: CourseWithStats) => {
    setEditingCourse(course);
    setCourseName(course.name);
    setCourseCode(course.code);
    setCourseDescription(course.description || "");
    setCourseSemester(course.semester || "");
    setCourseUniversity(course.university || "");
    setEditModalOpen(true);
  };

  const openDeleteDialog = (course: CourseWithStats) => {
    setCourseToDelete(course);
    setDeleteDialogOpen(true);
  };

  const openValidationRequestModal = (course: CourseWithStats) => {
    setCourseForValidation(course);
    setValidationNote("");
    setValidationRequestModalOpen(true);
  };

  const handleRequestValidation = () => {
    if (!courseForValidation) return;
    requestValidationMutation.mutate({
      courseId: courseForValidation.id,
      note: validationNote.trim() || undefined,
    });
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

  // Only validated courses can receive uploads
  const validatedCourses = createdCourses.filter(c => c.isUniversityValidated);
  const pendingValidationCourses = createdCourses.filter(
    c => c.universityValidationStatus === 'pending' && !c.isUniversityValidated
  );
  const unvalidatedCourses = createdCourses.filter(
    c => !c.isUniversityValidated && c.universityValidationStatus !== 'pending'
  );

  const getValidationStatusBadge = (course: CourseWithStats) => {
    if (course.isUniversityValidated) {
      return (
        <Badge variant="default" className="bg-green-600 text-xs">
          <CheckCircle className="h-3 w-3 mr-1" />
          University Validated
        </Badge>
      );
    }
    if (course.universityValidationStatus === 'pending') {
      return (
        <Badge variant="secondary" className="text-xs">
          <Clock className="h-3 w-3 mr-1" />
          Pending Validation
        </Badge>
      );
    }
    if (course.universityValidationStatus === 'rejected') {
      return (
        <Badge variant="destructive" className="text-xs">
          <XCircle className="h-3 w-3 mr-1" />
          Validation Rejected
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-xs">
        <AlertCircle className="h-3 w-3 mr-1" />
        Not Validated
      </Badge>
    );
  };

  const getStudentName = (student: PendingValidation['student']) => {
    return student.displayName || `${student.firstName || ''} ${student.lastName || ''}`.trim() || 'Unknown Student';
  };

  const getStudentInitials = (student: PendingValidation['student']) => {
    const name = getStudentName(student);
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

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
                    Create a course, then request university validation to enable uploads
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Validated Courses Section */}
                  {validatedCourses.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-sm text-green-700 dark:text-green-400 mb-3 flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        University Validated ({validatedCourses.length})
                      </h3>
                      <Accordion type="single" collapsible className="w-full">
                        {validatedCourses.map((course) => renderCourseAccordionItem(course))}
                      </Accordion>
                    </div>
                  )}

                  {/* Pending Validation Courses Section */}
                  {pendingValidationCourses.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-sm text-amber-700 dark:text-amber-400 mb-3 flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Pending University Validation ({pendingValidationCourses.length})
                      </h3>
                      <Accordion type="single" collapsible className="w-full">
                        {pendingValidationCourses.map((course) => renderCourseAccordionItem(course))}
                      </Accordion>
                    </div>
                  )}

                  {/* Unvalidated Courses Section */}
                  {unvalidatedCourses.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-sm text-muted-foreground mb-3 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        Awaiting Validation Request ({unvalidatedCourses.length})
                      </h3>
                      <Accordion type="single" collapsible className="w-full">
                        {unvalidatedCourses.map((course) => renderCourseAccordionItem(course))}
                      </Accordion>
                    </div>
                  )}
                </div>
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
              {validatedCourses.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-md">
                  <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="font-medium">No validated courses available</p>
                  <p className="text-sm mt-1">
                    You can only upload materials to courses that have been validated by your university.
                  </p>
                  <p className="text-sm mt-2">
                    Create a course and request university validation to get started.
                  </p>
                </div>
              ) : (
                <>
                  <div>
                    <Label htmlFor="course-select">Select Validated Course *</Label>
                    <Select
                      value={selectedCourseId}
                      onValueChange={setSelectedCourseId}
                    >
                      <SelectTrigger id="course-select" data-testid="select-upload-course">
                        <SelectValue placeholder="Choose a validated course" />
                      </SelectTrigger>
                      <SelectContent>
                        {validatedCourses.map((course) => (
                          <SelectItem key={course.id} value={course.id}>
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-3 w-3 text-green-600" />
                              {course.code} - {course.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      Only university-validated courses can receive material uploads
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
                    disabled={!selectedFile || !selectedCourseId || isUploading}
                    className="w-full"
                    data-testid="button-upload-content"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {isUploading ? "Uploading..." : "Upload Content"}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* All uploaded materials */}
          {teacherContent.length > 0 && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>All Uploaded Materials</CardTitle>
              </CardHeader>
              <CardContent>
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
                                    <Badge key={i} variant="outline" className="text-xs">
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          {content.fileUrl && (
                            <Button
                              variant="ghost"
                              size="icon"
                              asChild
                            >
                              <a href={content.fileUrl} download target="_blank" rel="noopener noreferrer">
                                <Download className="h-4 w-4" />
                              </a>
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteMutation.mutate(content.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Validations Tab - Student Course Validations */}
        <TabsContent value="validations" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-purple-600" />
                Student Course Validations
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pendingValidations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No pending validation requests</p>
                  <p className="text-sm mt-1">
                    When students add your courses to their profiles, validation requests will appear here
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingValidations.map((validation) => (
                    <div
                      key={validation.id}
                      className="border rounded-md p-4 space-y-3"
                      data-testid={`validation-request-${validation.id}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={validation.student.profileImageUrl || undefined} />
                            <AvatarFallback>
                              {getStudentInitials(validation.student)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{getStudentName(validation.student)}</p>
                            {validation.student.university && (
                              <p className="text-sm text-muted-foreground">{validation.student.university}</p>
                            )}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => validateMutation.mutate({ id: validation.id })}
                          disabled={validateMutation.isPending}
                          data-testid={`button-validate-student-${validation.id}`}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Validate
                        </Button>
                      </div>
                      <div className="bg-muted p-3 rounded-md">
                        <p className="font-medium">{validation.courseName}</p>
                        {validation.courseCode && (
                          <p className="text-sm text-muted-foreground">Code: {validation.courseCode}</p>
                        )}
                        {validation.semester && validation.year && (
                          <p className="text-sm text-muted-foreground">
                            {validation.semester} {validation.year}
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Course</DialogTitle>
            <DialogDescription>
              Create a course to organize your teaching materials. After creation, request university validation to enable uploads.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="new-course-name">Course Name *</Label>
              <Input
                id="new-course-name"
                value={courseName}
                onChange={(e) => setCourseName(e.target.value)}
                placeholder="e.g., Introduction to Computer Science"
                data-testid="input-course-name"
              />
            </div>
            <div>
              <Label htmlFor="new-course-code">Course Code *</Label>
              <Input
                id="new-course-code"
                value={courseCode}
                onChange={(e) => setCourseCode(e.target.value)}
                placeholder="e.g., CS101"
                data-testid="input-course-code"
              />
            </div>
            <div>
              <Label htmlFor="new-course-description">Description</Label>
              <Textarea
                id="new-course-description"
                value={courseDescription}
                onChange={(e) => setCourseDescription(e.target.value)}
                placeholder="Brief course description..."
                data-testid="textarea-course-description"
              />
            </div>
            <div>
              <Label htmlFor="new-course-semester">Semester</Label>
              <Input
                id="new-course-semester"
                value={courseSemester}
                onChange={(e) => setCourseSemester(e.target.value)}
                placeholder="e.g., Fall 2024"
                data-testid="input-course-semester"
              />
            </div>
            <div>
              <Label htmlFor="new-course-university">University</Label>
              <Input
                id="new-course-university"
                value={courseUniversity}
                onChange={(e) => setCourseUniversity(e.target.value)}
                placeholder={userData?.university || "e.g., MIT"}
                data-testid="input-course-university"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateCourse}
              disabled={createCourseMutation.isPending}
              data-testid="button-confirm-create-course"
            >
              {createCourseMutation.isPending ? "Creating..." : "Create Course"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Course Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Course</DialogTitle>
            <DialogDescription>
              Update course details. Note: Editing a validated course may require re-validation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-course-name">Course Name *</Label>
              <Input
                id="edit-course-name"
                value={courseName}
                onChange={(e) => setCourseName(e.target.value)}
                data-testid="input-edit-course-name"
              />
            </div>
            <div>
              <Label htmlFor="edit-course-code">Course Code *</Label>
              <Input
                id="edit-course-code"
                value={courseCode}
                onChange={(e) => setCourseCode(e.target.value)}
                data-testid="input-edit-course-code"
              />
            </div>
            <div>
              <Label htmlFor="edit-course-description">Description</Label>
              <Textarea
                id="edit-course-description"
                value={courseDescription}
                onChange={(e) => setCourseDescription(e.target.value)}
                data-testid="textarea-edit-course-description"
              />
            </div>
            <div>
              <Label htmlFor="edit-course-semester">Semester</Label>
              <Input
                id="edit-course-semester"
                value={courseSemester}
                onChange={(e) => setCourseSemester(e.target.value)}
                data-testid="input-edit-course-semester"
              />
            </div>
            <div>
              <Label htmlFor="edit-course-university">University</Label>
              <Input
                id="edit-course-university"
                value={courseUniversity}
                onChange={(e) => setCourseUniversity(e.target.value)}
                data-testid="input-edit-course-university"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdateCourse}
              disabled={updateCourseMutation.isPending}
              data-testid="button-confirm-edit-course"
            >
              {updateCourseMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Course Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Course?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{courseToDelete?.name}" and all associated materials.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => courseToDelete && deleteCourseMutation.mutate(courseToDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete-course"
            >
              {deleteCourseMutation.isPending ? "Deleting..." : "Delete Course"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Request Validation Modal */}
      <Dialog open={validationRequestModalOpen} onOpenChange={setValidationRequestModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request University Validation</DialogTitle>
            <DialogDescription>
              Submit this course for validation by your university. Once validated, you can upload materials and students can access AI tutoring.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {courseForValidation && (
              <div className="bg-muted p-3 rounded-md">
                <p className="font-medium">{courseForValidation.name}</p>
                <p className="text-sm text-muted-foreground">Code: {courseForValidation.code}</p>
                {courseForValidation.semester && (
                  <p className="text-sm text-muted-foreground">{courseForValidation.semester}</p>
                )}
              </div>
            )}
            <div>
              <Label htmlFor="validation-note">Note for University (optional)</Label>
              <Textarea
                id="validation-note"
                value={validationNote}
                onChange={(e) => setValidationNote(e.target.value)}
                placeholder="Add any additional information for the validation review..."
                rows={3}
                data-testid="textarea-validation-note"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setValidationRequestModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleRequestValidation}
              disabled={requestValidationMutation.isPending}
              data-testid="button-confirm-request-validation"
            >
              <Send className="h-4 w-4 mr-2" />
              {requestValidationMutation.isPending ? "Sending..." : "Request Validation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

  function renderCourseAccordionItem(course: CourseWithStats) {
    const courseMaterials = contentByCourse[course.id] || [];
    const canUpload = course.isUniversityValidated;
    const canRequestValidation = !course.isUniversityValidated && course.universityValidationStatus !== 'pending';

    return (
      <AccordionItem key={course.id} value={course.id}>
        <AccordionTrigger className="hover:no-underline">
          <div className="flex items-center gap-3 flex-1">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center flex-shrink-0">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <div className="text-left flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold">{course.name}</h3>
                {getValidationStatusBadge(course)}
              </div>
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

            {/* Validation status message */}
            {!course.isUniversityValidated && (
              <div className={`p-3 rounded-md text-sm ${
                course.universityValidationStatus === 'pending'
                  ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300'
                  : course.universityValidationStatus === 'rejected'
                  ? 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300'
                  : 'bg-muted'
              }`}>
                {course.universityValidationStatus === 'pending' && (
                  <>
                    <Clock className="h-4 w-4 inline mr-2" />
                    Awaiting university validation. You'll be notified once reviewed.
                  </>
                )}
                {course.universityValidationStatus === 'rejected' && (
                  <>
                    <XCircle className="h-4 w-4 inline mr-2" />
                    Validation was rejected.
                    {course.universityValidationNote && (
                      <span className="block mt-1">Reason: {course.universityValidationNote}</span>
                    )}
                  </>
                )}
                {!course.universityValidationStatus && (
                  <>
                    <AlertCircle className="h-4 w-4 inline mr-2" />
                    Request university validation to enable material uploads.
                  </>
                )}
              </div>
            )}
            
            <div className="flex items-center gap-2 flex-wrap">
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
              
              {canUpload && (
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
              )}

              {canRequestValidation && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => openValidationRequestModal(course)}
                  data-testid={`button-request-validation-${course.id}`}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Request Validation
                </Button>
              )}

              <Button
                size="sm"
                variant="ghost"
                onClick={() => openEditModal(course)}
                data-testid={`button-edit-course-${course.id}`}
              >
                <Edit2 className="h-4 w-4" />
              </Button>

              <Button
                size="sm"
                variant="ghost"
                onClick={() => openDeleteDialog(course)}
                data-testid={`button-delete-course-${course.id}`}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
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
                            size="icon"
                            asChild
                          >
                            <a href={content.fileUrl} download target="_blank" rel="noopener noreferrer">
                              <Download className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
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
  }
}
