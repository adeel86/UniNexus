import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Users, GraduationCap, BookOpen, Building2, Mail, ExternalLink } from "lucide-react";
import type { User } from "@shared/schema";

interface UserListCardProps {
  user: User & {
    courseCount?: number;
    validatedCourseCount?: number;
    pendingCourseCount?: number;
    validatedCourses?: any[];
  };
  showTeacherStats?: boolean;
  showStudentStats?: boolean;
}

export function UserListCard({ user, showTeacherStats, showStudentStats }: UserListCardProps) {
  const getInitials = () => {
    const first = user.firstName?.charAt(0) || "";
    const last = user.lastName?.charAt(0) || "";
    return (first + last).toUpperCase() || "U";
  };

  const getUserName = () => {
    return `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.displayName || "Unknown User";
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "teacher":
        return "bg-purple-600";
      case "student":
        return "bg-blue-600";
      case "university":
        return "bg-green-600";
      case "industry":
        return "bg-amber-600";
      default:
        return "bg-gray-600";
    }
  };

  return (
    <Card className="hover-elevate" data-testid={`user-card-${user.id}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={user.profileImageUrl || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white font-semibold">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold">{getUserName()}</h3>
                <Badge variant="secondary" className={`${getRoleBadgeColor(user.role)} text-white text-xs`}>
                  {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                </Badge>
              </div>
              
              {user.major && (
                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                  <GraduationCap className="h-3 w-3" />
                  {user.major}
                </p>
              )}
              
              {user.university && (
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  {user.university}
                </p>
              )}

              {showTeacherStats && (
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {user.courseCount !== undefined && (
                    <Badge variant="outline" className="text-xs">
                      <BookOpen className="h-3 w-3 mr-1" />
                      {user.courseCount} courses
                    </Badge>
                  )}
                  {user.validatedCourseCount !== undefined && user.validatedCourseCount > 0 && (
                    <Badge variant="default" className="bg-green-600 text-xs">
                      {user.validatedCourseCount} validated
                    </Badge>
                  )}
                  {user.pendingCourseCount !== undefined && user.pendingCourseCount > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {user.pendingCourseCount} pending
                    </Badge>
                  )}
                </div>
              )}

              {showStudentStats && user.validatedCourses && user.validatedCourses.length > 0 && (
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <Badge variant="outline" className="text-xs">
                    <BookOpen className="h-3 w-3 mr-1" />
                    {user.validatedCourses.length} validated courses
                  </Badge>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              asChild
              data-testid={`button-view-profile-${user.id}`}
            >
              <Link href={`/profile?userId=${user.id}`}>
                <ExternalLink className="h-4 w-4 mr-1" />
                Profile
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
