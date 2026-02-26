import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CheckCircle, XCircle, Clock } from "lucide-react";
import { Link } from "wouter";
import type { PendingCourse } from "./useUniversityDashboard";
import { getInstructorName, getInstructorInitials } from "./useUniversityDashboard";

interface PendingCourseCardProps {
  course: PendingCourse;
  onApprove: (course: PendingCourse) => void;
  onReject: (course: PendingCourse) => void;
  isApproving: boolean;
  isRejecting: boolean;
}

export function PendingCourseCard({
  course,
  onApprove,
  onReject,
  isApproving,
  isRejecting,
}: PendingCourseCardProps) {
  return (
    <div
      className="border rounded-md p-4 space-y-4"
      data-testid={`pending-course-${course.id}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <h3 className="font-semibold text-lg">{course.name}</h3>
            <Badge variant="outline">{course.code}</Badge>
            <Badge variant="secondary" className="text-xs">
              <Clock className="h-3 w-3 mr-1" />
              Pending Review
            </Badge>
          </div>
          
          {course.description && (
            <p className="text-sm text-muted-foreground mb-3">
              {course.description}
            </p>
          )}

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {course.semester && (
              <span>Semester: {course.semester}</span>
            )}
            {course.university && (
              <span>University: {course.university}</span>
            )}
            {course.validationRequestedAt || course.createdAt ? (
              <span>
                Requested: {new Date((course.validationRequestedAt || course.createdAt) as string | number | Date).toLocaleDateString()}
              </span>
            ) : null}
          </div>
        </div>

        {course.instructor && (
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={course.instructor.profileImageUrl || undefined} />
              <AvatarFallback>
                {getInstructorInitials(course.instructor)}
              </AvatarFallback>
            </Avatar>
            <div className="text-right">
              <Link href={`/profile/${course.instructor.id}`}>
                <span className="font-medium hover:underline cursor-pointer">
                  {getInstructorName(course.instructor)}
                </span>
              </Link>
              {course.instructor.email && (
                <p className="text-xs text-muted-foreground">{course.instructor.email}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {course.universityValidationNote && (
        <div className="bg-muted p-3 rounded-md text-sm">
          <span className="font-medium">Teacher's Note: </span>
          <span>{course.universityValidationNote}</span>
        </div>
      )}

      <div className="flex items-center justify-end gap-2 pt-3 border-t">
        <Button
          variant="outline"
          onClick={() => onReject(course)}
          disabled={isRejecting}
          data-testid={`button-reject-course-${course.id}`}
        >
          <XCircle className="h-4 w-4 mr-2" />
          Reject
        </Button>
        <Button
          onClick={() => onApprove(course)}
          disabled={isApproving}
          data-testid={`button-approve-course-${course.id}`}
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          Approve
        </Button>
      </div>
    </div>
  );
}
