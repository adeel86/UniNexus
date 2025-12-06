import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import type { TeacherContent, Course, StudentCourse } from "@shared/schema";

export type CourseWithStats = Course & {
  discussionCount: number;
  enrollmentCount: number;
};

export type PendingValidation = StudentCourse & {
  student: {
    id: string;
    displayName: string;
    firstName: string;
    lastName: string;
    profileImageUrl: string;
    university: string;
  };
};

export function useTeacherContent(teacherId: string) {
  const { toast } = useToast();
  const { userData } = useAuth();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const [courseName, setCourseName] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [courseDescription, setCourseDescription] = useState("");
  const [courseSemester, setCourseSemester] = useState("");
  const [courseUniversity, setCourseUniversity] = useState("");

  const [editMaterialTitle, setEditMaterialTitle] = useState("");
  const [editMaterialDescription, setEditMaterialDescription] = useState("");
  const [editMaterialTags, setEditMaterialTags] = useState("");
  const [editMaterialIsPublic, setEditMaterialIsPublic] = useState(true);

  const { data: createdCourses = [], isLoading: coursesLoading } = useQuery<CourseWithStats[]>({
    queryKey: ["/api/me/created-courses"],
    enabled: userData?.role === 'teacher',
  });

  const { data: teacherContent = [] } = useQuery<TeacherContent[]>({
    queryKey: [`/api/teacher-content/teacher/${teacherId}`],
  });

  const { data: pendingValidations = [] } = useQuery<PendingValidation[]>({
    queryKey: ["/api/teacher/pending-validations"],
    enabled: userData?.role === 'teacher',
  });

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
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create course",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const updateCourseMutation = useMutation({
    mutationFn: async (courseId: string) => {
      return apiRequest("PATCH", `/api/courses/${courseId}`, {
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
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update course",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const deleteCourseMutation = useMutation({
    mutationFn: async (courseId: string) => {
      return apiRequest("DELETE", `/api/courses/${courseId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/me/created-courses"] });
      toast({ title: "Course deleted successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete course",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

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
    },
    onError: (error: any) => {
      toast({
        title: "Failed to request validation",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (courseForMaterials: CourseWithStats) => {
      if (!selectedFile) {
        throw new Error("Please select a file");
      }
      if (!courseForMaterials.isUniversityValidated || courseForMaterials.universityValidationStatus !== 'validated') {
        throw new Error("Materials can only be uploaded to university-validated courses");
      }

      setIsUploading(true);
      const formData = new FormData();
      formData.append("document", selectedFile);
      formData.append("title", title || selectedFile.name);
      formData.append("description", description);
      formData.append("tags", tags);
      formData.append("isPublic", isPublic.toString());
      formData.append("courseId", courseForMaterials.id);

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

  const deleteMaterialMutation = useMutation({
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

  const updateMaterialMutation = useMutation({
    mutationFn: async (materialId: string) => {
      return apiRequest("PATCH", `/api/teacher-content/${materialId}`, {
        title: editMaterialTitle,
        description: editMaterialDescription || null,
        tags: editMaterialTags.split(",").map(t => t.trim()).filter(Boolean),
        isPublic: editMaterialIsPublic,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/teacher-content/teacher/${teacherId}`] });
      toast({ title: "Material updated successfully!" });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update material",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const validateStudentMutation = useMutation({
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
  };

  const resetCourseForm = () => {
    setCourseName("");
    setCourseCode("");
    setCourseDescription("");
    setCourseSemester("");
    setCourseUniversity("");
  };

  const populateCourseForm = (course: CourseWithStats) => {
    setCourseName(course.name);
    setCourseCode(course.code);
    setCourseDescription(course.description || "");
    setCourseSemester(course.semester || "");
    setCourseUniversity(course.university || "");
  };

  const populateMaterialForm = (material: TeacherContent) => {
    setEditMaterialTitle(material.title);
    setEditMaterialDescription(material.description || "");
    setEditMaterialTags(material.tags?.join(", ") || "");
    setEditMaterialIsPublic(material.isPublic);
  };

  const contentByCourse = teacherContent.reduce((acc, content) => {
    const courseId = content.courseId || 'uncategorized';
    if (!acc[courseId]) {
      acc[courseId] = [];
    }
    acc[courseId].push(content);
    return acc;
  }, {} as Record<string, TeacherContent[]>);

  const validatedCourses = createdCourses.filter(c => c.isUniversityValidated);
  const pendingValidationCourses = createdCourses.filter(
    c => c.universityValidationStatus === 'pending' && !c.isUniversityValidated
  );
  const unvalidatedCourses = createdCourses.filter(
    c => !c.isUniversityValidated && c.universityValidationStatus !== 'pending'
  );

  return {
    userData,
    coursesLoading,
    createdCourses,
    teacherContent,
    pendingValidations,
    contentByCourse,
    validatedCourses,
    pendingValidationCourses,
    unvalidatedCourses,
    uploadForm: {
      title, setTitle,
      description, setDescription,
      tags, setTags,
      isPublic, setIsPublic,
      selectedFile, setSelectedFile,
      isUploading,
      handleFileSelect,
      reset: resetUploadForm,
    },
    courseForm: {
      name: courseName, setName: setCourseName,
      code: courseCode, setCode: setCourseCode,
      description: courseDescription, setDescription: setCourseDescription,
      semester: courseSemester, setSemester: setCourseSemester,
      university: courseUniversity, setUniversity: setCourseUniversity,
      reset: resetCourseForm,
      populate: populateCourseForm,
    },
    materialForm: {
      title: editMaterialTitle, setTitle: setEditMaterialTitle,
      description: editMaterialDescription, setDescription: setEditMaterialDescription,
      tags: editMaterialTags, setTags: setEditMaterialTags,
      isPublic: editMaterialIsPublic, setIsPublic: setEditMaterialIsPublic,
      populate: populateMaterialForm,
    },
    mutations: {
      createCourse: createCourseMutation,
      updateCourse: updateCourseMutation,
      deleteCourse: deleteCourseMutation,
      requestValidation: requestValidationMutation,
      upload: uploadMutation,
      deleteMaterial: deleteMaterialMutation,
      updateMaterial: updateMaterialMutation,
      validateStudent: validateStudentMutation,
    },
    toast,
  };
}
