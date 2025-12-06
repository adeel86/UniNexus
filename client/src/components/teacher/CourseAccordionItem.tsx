import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Link } from "wouter";
import {
  BookOpen,
  Users,
  MessageSquare,
  FolderOpen,
  Send,
  Edit2,
  Trash2,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  FileText,
  ChevronRight,
} from "lucide-react";
import type { TeacherContent } from "@shared/schema";
import type { CourseWithStats } from "./useTeacherContent";

interface CourseAccordionItemProps {
  course: CourseWithStats;
  isValidated: boolean;
  courseMaterials: TeacherContent[];
  onOpenMaterials: (course: CourseWithStats) => void;
  onRequestValidation: (course: CourseWithStats) => void;
  onEdit: (course: CourseWithStats) => void;
  onDelete: (course: CourseWithStats) => void;
}

export function CourseAccordionItem({
  course,
  isValidated,
  courseMaterials,
  onOpenMaterials,
  onRequestValidation,
  onEdit,
  onDelete,
}: CourseAccordionItemProps) {
  const canRequestValidation = !course.isUniversityValidated && course.universityValidationStatus !== 'pending';

  const getValidationStatusBadge = () => {
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

  return (
    <AccordionItem value={course.id}>
      <AccordionTrigger className="hover:no-underline">
        <div className="flex items-center gap-3 flex-1">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center flex-shrink-0">
            <BookOpen className="h-5 w-5 text-white" />
          </div>
          <div className="text-left flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold">{course.name}</h3>
              {getValidationStatusBadge()}
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
            
            {isValidated && (
              <Button
                size="sm"
                onClick={() => onOpenMaterials(course)}
                data-testid={`button-manage-materials-${course.id}`}
              >
                <FolderOpen className="h-4 w-4 mr-2" />
                Manage Materials ({courseMaterials.length})
              </Button>
            )}

            {canRequestValidation && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => onRequestValidation(course)}
                data-testid={`button-request-validation-${course.id}`}
              >
                <Send className="h-4 w-4 mr-2" />
                Request Validation
              </Button>
            )}

            <Button
              size="sm"
              variant="ghost"
              onClick={() => onEdit(course)}
              data-testid={`button-edit-course-${course.id}`}
            >
              <Edit2 className="h-4 w-4 mr-2" />
              Edit
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={() => onDelete(course)}
              className="text-destructive hover:text-destructive"
              data-testid={`button-delete-course-${course.id}`}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>

          {isValidated && courseMaterials.length > 0 && (
            <div className="border-t pt-4 mt-2">
              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Recent Materials
              </h4>
              <div className="space-y-1">
                {courseMaterials.slice(0, 3).map((material) => (
                  <div
                    key={material.id}
                    className="flex items-center justify-between text-sm p-2 rounded hover-elevate"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span>{material.title}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {material.uploadedAt ? new Date(material.uploadedAt).toLocaleDateString() : ""}
                    </span>
                  </div>
                ))}
                {courseMaterials.length > 3 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full"
                    onClick={() => onOpenMaterials(course)}
                  >
                    View all {courseMaterials.length} materials
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
