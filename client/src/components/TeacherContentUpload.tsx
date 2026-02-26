import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Accordion } from "@/components/ui/accordion";
import { Plus, BookOpen, GraduationCap, Loader2, CheckCircle, Clock, AlertCircle } from "lucide-react";
import type { TeacherContent } from "@shared/schema";

import {
  useTeacherContent,
  CourseFormModal,
  DeleteCourseDialog,
  ValidationRequestModal,
  CourseMaterialsModal,
  EditMaterialModal,
  CourseAccordionItem,
  StudentValidationCard,
  type CourseWithStats,
} from "./teacher";

interface TeacherContentUploadProps {
  teacherId: string;
}

export function TeacherContentUpload({ teacherId }: TeacherContentUploadProps) {
  const {
    userData,
    coursesLoading,
    createdCourses,
    pendingValidations,
    contentByCourse,
    validatedCourses,
    pendingValidationCourses,
    unvalidatedCourses,
    uploadForm,
    courseForm,
    materialForm,
    mutations,
    toast,
  } = useTeacherContent(teacherId);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<CourseWithStats | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState<CourseWithStats | null>(null);
  const [validationRequestModalOpen, setValidationRequestModalOpen] = useState(false);
  const [courseForValidation, setCourseForValidation] = useState<CourseWithStats | null>(null);
  const [materialsModalOpen, setMaterialsModalOpen] = useState(false);
  const [selectedCourseForMaterials, setSelectedCourseForMaterials] = useState<CourseWithStats | null>(null);
  const [editMaterialModalOpen, setEditMaterialModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<TeacherContent | null>(null);

  const handleCreateCourse = () => {
    if (!courseForm.name.trim() || !courseForm.code.trim()) {
      toast({
        title: "Missing required fields",
        description: "Please enter both course name and code",
        variant: "destructive",
      });
      return;
    }
    mutations.createCourse.mutate(undefined, {
      onSuccess: () => {
        setCreateModalOpen(false);
        courseForm.reset();
      },
    });
  };

  const handleUpdateCourse = () => {
    if (!courseForm.name.trim() || !courseForm.code.trim() || !editingCourse) {
      toast({
        title: "Missing required fields",
        description: "Please enter both course name and code",
        variant: "destructive",
      });
      return;
    }
    mutations.updateCourse.mutate(editingCourse.id, {
      onSuccess: () => {
        setEditModalOpen(false);
        setEditingCourse(null);
        courseForm.reset();
      },
    });
  };

  const openEditModal = (course: CourseWithStats) => {
    setEditingCourse(course);
    courseForm.populate(course);
    setEditModalOpen(true);
  };

  const openDeleteDialog = (course: CourseWithStats) => {
    setCourseToDelete(course);
    setDeleteDialogOpen(true);
  };

  const openValidationRequestModal = (course: CourseWithStats) => {
    setCourseForValidation(course);
    setValidationRequestModalOpen(true);
  };

  const openMaterialsModal = (course: CourseWithStats) => {
    if (!course.isUniversityValidated || course.universityValidationStatus !== 'validated') {
      toast({
        title: "Course not validated",
        description: "Materials can only be managed for university-validated courses.",
        variant: "destructive",
      });
      return;
    }
    setSelectedCourseForMaterials(course);
    setMaterialsModalOpen(true);
    uploadForm.reset();
  };

  const openEditMaterialModal = (material: TeacherContent) => {
    setEditingMaterial(material);
    materialForm.populate(material);
    setEditMaterialModalOpen(true);
  };

  const handleRequestValidation = (note: string) => {
    if (!courseForValidation) return;
    mutations.requestValidation.mutate(
      { courseId: courseForValidation.id, note: note || undefined },
      {
        onSuccess: () => {
          setValidationRequestModalOpen(false);
          setCourseForValidation(null);
        },
      }
    );
  };

  const handleUpload = () => {
    if (!selectedCourseForMaterials) return;
    mutations.upload.mutate(selectedCourseForMaterials, {
      onSuccess: () => {
        uploadForm.reset();
      },
    });
  };

  const handleDeleteCourse = () => {
    if (!courseToDelete) return;
    mutations.deleteCourse.mutate(courseToDelete.id, {
      onSuccess: () => {
        setDeleteDialogOpen(false);
        setCourseToDelete(null);
      },
    });
  };

  const handleUpdateMaterial = () => {
    if (!editingMaterial) return;
    mutations.updateMaterial.mutate(editingMaterial.id, {
      onSuccess: () => {
        setEditMaterialModalOpen(false);
        setEditingMaterial(null);
      },
    });
  };

  const selectedCourseMaterials = selectedCourseForMaterials
    ? contentByCourse[selectedCourseForMaterials.id] || []
    : [];

  const getCourseNameById = (courseId: string) => {
    const course = createdCourses.find(c => c.id === courseId);
    return course?.name;
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="courses" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="courses" data-testid="tab-my-courses">
            <GraduationCap className="h-4 w-4 mr-2" />
            Courses
          </TabsTrigger>
          <TabsTrigger value="validations" data-testid="tab-validations">
            <CheckCircle className="h-4 w-4 mr-2" />
            Validations Requests
            {pendingValidations.length > 0 && (
              <Badge variant="destructive" className="ml-2 text-xs">
                {pendingValidations.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

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
                  {validatedCourses.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-sm text-green-700 dark:text-green-400 mb-3 flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        University Validated ({validatedCourses.length})
                      </h3>
                      <Accordion type="single" collapsible className="w-full">
                        {validatedCourses.map((course) => (
                          <CourseAccordionItem
                            key={course.id}
                            course={course}
                            isValidated={true}
                            courseMaterials={contentByCourse[course.id] || []}
                            onOpenMaterials={openMaterialsModal}
                            onRequestValidation={openValidationRequestModal}
                            onEdit={openEditModal}
                            onDelete={openDeleteDialog}
                          />
                        ))}
                      </Accordion>
                    </div>
                  )}

                  {pendingValidationCourses.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-sm text-amber-700 dark:text-amber-400 mb-3 flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Pending University Validation ({pendingValidationCourses.length})
                      </h3>
                      <Accordion type="single" collapsible className="w-full">
                        {pendingValidationCourses.map((course) => (
                          <CourseAccordionItem
                            key={course.id}
                            course={course}
                            isValidated={false}
                            courseMaterials={contentByCourse[course.id] || []}
                            onOpenMaterials={openMaterialsModal}
                            onRequestValidation={openValidationRequestModal}
                            onEdit={openEditModal}
                            onDelete={openDeleteDialog}
                          />
                        ))}
                      </Accordion>
                    </div>
                  )}

                  {unvalidatedCourses.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-sm text-muted-foreground mb-3 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        Awaiting Validation Request ({unvalidatedCourses.length})
                      </h3>
                      <Accordion type="single" collapsible className="w-full">
                        {unvalidatedCourses.map((course) => (
                          <CourseAccordionItem
                            key={course.id}
                            course={course}
                            isValidated={false}
                            courseMaterials={contentByCourse[course.id] || []}
                            onOpenMaterials={openMaterialsModal}
                            onRequestValidation={openValidationRequestModal}
                            onEdit={openEditModal}
                            onDelete={openDeleteDialog}
                          />
                        ))}
                      </Accordion>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

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
                    <StudentValidationCard
                      key={validation.id}
                      validation={validation}
                      courseName={getCourseNameById(validation.courseId as string) || ""}
                      isPending={mutations.validateStudent.isPending}
                      onValidate={(id, note) => mutations.validateStudent.mutate({ id, note })}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <CourseFormModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        mode="create"
        courseForm={courseForm}
        isPending={mutations.createCourse.isPending}
        onSubmit={handleCreateCourse}
        defaultUniversity={userData?.university || undefined}
      />

      <CourseFormModal
        open={editModalOpen}
        onOpenChange={(open) => {
          setEditModalOpen(open);
          if (!open) {
            setEditingCourse(null);
            courseForm.reset();
          }
        }}
        mode="edit"
        courseForm={courseForm}
        isPending={mutations.updateCourse.isPending}
        onSubmit={handleUpdateCourse}
      />

      <DeleteCourseDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        course={courseToDelete}
        isPending={mutations.deleteCourse.isPending}
        onConfirm={handleDeleteCourse}
      />

      <ValidationRequestModal
        open={validationRequestModalOpen}
        onOpenChange={setValidationRequestModalOpen}
        course={courseForValidation}
        isPending={mutations.requestValidation.isPending}
        onSubmit={handleRequestValidation}
      />

      <CourseMaterialsModal
        open={materialsModalOpen}
        onOpenChange={(open) => {
          setMaterialsModalOpen(open);
          if (!open) {
            setSelectedCourseForMaterials(null);
            uploadForm.reset();
          }
        }}
        course={selectedCourseForMaterials}
        materials={selectedCourseMaterials}
        uploadForm={uploadForm}
        isUploadPending={mutations.upload.isPending}
        onUpload={handleUpload}
        onDeleteMaterial={(id) => mutations.deleteMaterial.mutate(id)}
        onEditMaterial={openEditMaterialModal}
      />

      <EditMaterialModal
        open={editMaterialModalOpen}
        onOpenChange={(open) => {
          setEditMaterialModalOpen(open);
          if (!open) {
            setEditingMaterial(null);
          }
        }}
        material={editingMaterial}
        materialForm={materialForm}
        isPending={mutations.updateMaterial.isPending}
        onSubmit={handleUpdateMaterial}
      />
    </div>
  );
}
