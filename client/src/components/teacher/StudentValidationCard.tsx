import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CheckCircle, Clock } from "lucide-react";
import type { PendingValidation } from "./useTeacherContent";

interface StudentValidationCardProps {
  validation: PendingValidation;
  courseName?: string;
  isPending: boolean;
  onValidate: (id: string, note?: string) => void;
}

export function StudentValidationCard({
  validation,
  courseName,
  isPending,
  onValidate,
}: StudentValidationCardProps) {
  const getStudentName = (student: PendingValidation['student']) => {
    return student.displayName || `${student.firstName || ''} ${student.lastName || ''}`.trim() || 'Unknown Student';
  };

  const getStudentInitials = (student: PendingValidation['student']) => {
    const name = getStudentName(student);
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div
      className="border rounded-md p-4 space-y-3"
      data-testid={`validation-request-${validation.id}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={validation.student.profileImageUrl} />
            <AvatarFallback>{getStudentInitials(validation.student)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{getStudentName(validation.student)}</p>
            <p className="text-sm text-muted-foreground">
              {validation.student.university || "Unknown University"}
            </p>
          </div>
        </div>
        <Badge variant="secondary">
          <Clock className="h-3 w-3 mr-1" />
          Pending
        </Badge>
      </div>

      {courseName && (
        <div className="bg-muted p-2 rounded text-sm">
          <span className="text-muted-foreground">Course: </span>
          <span className="font-medium">{courseName}</span>
        </div>
      )}

      {validation.validationNote && (
        <p className="text-sm text-muted-foreground">
          Note: {validation.validationNote}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Button
          size="sm"
          onClick={() => onValidate(validation.id)}
          disabled={isPending}
          data-testid={`button-validate-${validation.id}`}
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          {isPending ? "Validating..." : "Validate Enrollment"}
        </Button>
      </div>
    </div>
  );
}
