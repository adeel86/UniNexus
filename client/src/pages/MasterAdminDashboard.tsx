import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { User, Post } from "@shared/schema";
import {
  Users, FileText, Shield, TrendingUp, CheckCircle, Trash2,
  AlertTriangle, Eye, ThumbsUp, ThumbsDown, Ban, AlertCircle,
  Clock, ShieldCheck, ShieldX, RefreshCw, BookOpen, UsersRound,
  ClipboardList, GraduationCap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/UserAvatar";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface AdminActionLog {
  id: string;
  adminId: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  details: Record<string, any> | null;
  createdAt: string;
  adminName: string | null;
  adminEmail: string | null;
}

interface AdminCourse {
  id: string;
  name: string;
  code: string;
  description: string | null;
  instructorId: string | null;
  instructorName: string | null;
  instructorEmail: string | null;
  status: string;
  isValidated: boolean;
  createdAt: string;
}

interface AdminGroup {
  id: string;
  name: string;
  description: string | null;
  groupType: string;
  isPrivate: boolean;
  creatorId: string | null;
  creatorName: string | null;
  creatorEmail: string | null;
  memberCount: number;
  createdAt: string;
}

interface FlaggedPost {
  id: string;
  content: string;
  imageUrl: string | null;
  videoUrl: string | null;
  mediaUrls: string[] | null;
  mediaType: string | null;
  isFlagged: boolean;
  flagReason: string | null;
  flagConfidence: string | null;
  moderationStatus: string;
  moderatedAt: string | null;
  createdAt: string;
  authorId: string;
  authorEmail: string | null;
  authorFirstName: string | null;
  authorLastName: string | null;
  authorProfileImageUrl: string | null;
}

interface ModerationLog {
  id: string;
  postId: string;
  adminId: string | null;
  action: string;
  note: string | null;
  createdAt: string;
  adminName: string | null;
}

function ConfidenceBadge({ confidence }: { confidence: string | null }) {
  if (!confidence) return null;
  const pct = Math.round(parseFloat(confidence) * 100);
  const variant = pct >= 80 ? "destructive" : pct >= 50 ? "secondary" : "outline";
  return (
    <Badge variant={variant} className="text-xs">
      {pct}% confidence
    </Badge>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "pending_review") {
    return (
      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
        <Clock className="h-3 w-3 mr-1" /> Pending Review
      </Badge>
    );
  }
  if (status === "rejected") {
    return (
      <Badge variant="destructive">
        <ShieldX className="h-3 w-3 mr-1" /> Rejected
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-900 dark:text-green-200">
      <ShieldCheck className="h-3 w-3 mr-1" /> Approved
    </Badge>
  );
}

export default function MasterAdminDashboard() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [previewPost, setPreviewPost] = useState<FlaggedPost | null>(null);

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
  });

  const { data: posts = [] } = useQuery<Post[]>({
    queryKey: ["/api/admin/posts"],
  });

  const { data: flaggedContent = [], isLoading: flaggedLoading } = useQuery<FlaggedPost[]>({
    queryKey: ["/api/admin/flagged-content"],
  });

  const { data: moderationLogs = [] } = useQuery<ModerationLog[]>({
    queryKey: ["/api/admin/moderation-logs"],
  });

  const { data: actionLogs = [] } = useQuery<AdminActionLog[]>({
    queryKey: ["/api/admin/action-logs"],
  });

  const { data: courses = [], isLoading: coursesLoading } = useQuery<AdminCourse[]>({
    queryKey: ["/api/admin/courses"],
  });

  const { data: groups = [], isLoading: groupsLoading } = useQuery<AdminGroup[]>({
    queryKey: ["/api/admin/groups"],
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest("DELETE", `/api/admin/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "User deleted", description: "The user has been permanently removed." });
    },
    onError: (error: any) => {
      toast({ title: "Deletion failed", description: error.message, variant: "destructive" });
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (postId: string) => {
      await apiRequest("POST", `/api/admin/moderation/${postId}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/flagged-content"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/moderation-logs"] });
      setPreviewPost(null);
      toast({ title: "Content approved", description: "The post is now visible in the feed." });
    },
    onError: (error: any) => {
      toast({ title: "Failed to approve", description: error.message, variant: "destructive" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (postId: string) => {
      await apiRequest("POST", `/api/admin/moderation/${postId}/reject`);
    },
    onSuccess: (_, postId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/flagged-content"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/moderation-logs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setPreviewPost(null);
      toast({
        title: "Content rejected",
        description: "Post removed. User has been notified and violation count updated.",
      });
    },
    onError: (error: any) => {
      toast({ title: "Failed to reject", description: error.message, variant: "destructive" });
    },
  });

  const banUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest("POST", `/api/admin/users/${userId}/ban`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "User banned", description: "The user's account has been permanently banned." });
    },
    onError: (error: any) => {
      toast({ title: "Ban failed", description: error.message, variant: "destructive" });
    },
  });

  const unbanUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest("POST", `/api/admin/users/${userId}/unban`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "User unbanned", description: "The user's account has been reinstated." });
    },
    onError: (error: any) => {
      toast({ title: "Unban failed", description: error.message, variant: "destructive" });
    },
  });

  const warnUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest("POST", `/api/admin/users/${userId}/warn`);
    },
    onSuccess: () => {
      toast({ title: "Warning sent", description: "A policy warning has been sent to the user." });
    },
    onError: (error: any) => {
      toast({ title: "Warning failed", description: error.message, variant: "destructive" });
    },
  });

  const deleteCourseMutation = useMutation({
    mutationFn: async (courseId: string) => {
      await apiRequest("DELETE", `/api/admin/courses/${courseId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/courses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/action-logs"] });
      toast({ title: "Course removed", description: "The course has been permanently deleted." });
    },
    onError: (error: any) => {
      toast({ title: "Failed to remove course", description: error.message, variant: "destructive" });
    },
  });

  const validateCourseMutation = useMutation({
    mutationFn: async (courseId: string) => {
      await apiRequest("PATCH", `/api/admin/courses/${courseId}/validate`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/courses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/action-logs"] });
      toast({ title: "Course validated", description: "The course is now marked as active." });
    },
    onError: (error: any) => {
      toast({ title: "Validation failed", description: error.message, variant: "destructive" });
    },
  });

  const deleteGroupMutation = useMutation({
    mutationFn: async (groupId: string) => {
      await apiRequest("DELETE", `/api/admin/groups/${groupId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/groups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/action-logs"] });
      toast({ title: "Group removed", description: "The group has been permanently deleted." });
    },
    onError: (error: any) => {
      toast({ title: "Failed to remove group", description: error.message, variant: "destructive" });
    },
  });

  const roleStats = {
    student: users.filter(u => u.role === 'student').length,
    teacher: users.filter(u => u.role === 'teacher').length,
    university_admin: users.filter(u => u.role === 'university_admin').length,
    industry_professional: users.filter(u => u.role === 'industry_professional').length,
    master_admin: users.filter(u => u.role === 'master_admin').length,
  };

  const pendingCount = flaggedContent.filter(p => p.moderationStatus === 'pending_review').length;
  const rejectedCount = flaggedContent.filter(p => p.moderationStatus === 'rejected').length;
  const bannedUsers = (users as any[]).filter(u => u.isBanned).length;

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="font-heading text-3xl font-bold mb-2">Master Admin Dashboard</h1>
        <p className="text-muted-foreground">Full platform control and moderation</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Users</p>
              <p className="text-3xl font-bold">{users.length}</p>
            </div>
            <Users className="h-8 w-8 text-primary" />
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Posts</p>
              <p className="text-3xl font-bold">{posts.length}</p>
            </div>
            <FileText className="h-8 w-8 text-blue-600" />
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Pending Review</p>
              <p className="text-3xl font-bold text-yellow-600">{pendingCount}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-yellow-600" />
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">System Health</p>
              <p className="text-3xl font-bold">
                <CheckCircle className="h-8 w-8 text-green-600 inline" />
              </p>
            </div>
            <Shield className="h-8 w-8 text-green-600" />
          </div>
        </Card>
      </div>

      <Tabs defaultValue="moderation" className="space-y-6">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="moderation" data-testid="tab-moderation">
            <Shield className="h-4 w-4 mr-1.5" />
            Content Moderation
            {pendingCount > 0 && (
              <Badge variant="destructive" className="ml-2 text-xs px-1.5 py-0">
                {pendingCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="users" data-testid="tab-users">
            <Users className="h-4 w-4 mr-1.5" />
            Users
          </TabsTrigger>
          <TabsTrigger value="courses" data-testid="tab-courses">
            <GraduationCap className="h-4 w-4 mr-1.5" />
            Courses
          </TabsTrigger>
          <TabsTrigger value="groups" data-testid="tab-groups">
            <UsersRound className="h-4 w-4 mr-1.5" />
            Groups
          </TabsTrigger>
          <TabsTrigger value="logs" data-testid="tab-logs">
            <ClipboardList className="h-4 w-4 mr-1.5" />
            Audit Logs
          </TabsTrigger>
          <TabsTrigger value="analytics" data-testid="tab-analytics">
            <TrendingUp className="h-4 w-4 mr-1.5" />
            Analytics
          </TabsTrigger>
        </TabsList>

        {/* ===================== MODERATION TAB ===================== */}
        <TabsContent value="moderation" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
              <div className="text-sm text-muted-foreground">Pending Review</div>
            </Card>
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold text-red-600">{rejectedCount}</div>
              <div className="text-sm text-muted-foreground">Rejected</div>
            </Card>
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold text-red-700">{bannedUsers}</div>
              <div className="text-sm text-muted-foreground">Banned Users</div>
            </Card>
          </div>

          {flaggedLoading ? (
            <Card className="p-8 flex items-center justify-center">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading flagged content...</span>
            </Card>
          ) : flaggedContent.length === 0 ? (
            <Card className="p-10 flex flex-col items-center justify-center text-center">
              <ShieldCheck className="h-12 w-12 text-green-500 mb-3" />
              <h3 className="font-semibold text-lg mb-1">All Clear</h3>
              <p className="text-muted-foreground text-sm">No flagged content to review at this time.</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {flaggedContent.map((item) => (
                <Card key={item.id} className="p-4" data-testid={`flagged-post-${item.id}`}>
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <StatusBadge status={item.moderationStatus} />
                        {item.flagReason && (
                          <Badge variant="outline" className="text-xs text-red-600 border-red-200">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            {item.flagReason}
                          </Badge>
                        )}
                        <ConfidenceBadge confidence={item.flagConfidence} />
                        <span className="text-xs text-muted-foreground ml-auto">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      <p className="text-sm line-clamp-3 mb-3 text-foreground">{item.content}</p>

                      {(item.imageUrl || (item.mediaUrls && item.mediaUrls.length > 0)) && (
                        <div className="flex gap-2 mb-3 flex-wrap">
                          {[item.imageUrl, ...(item.mediaUrls ?? [])].filter(Boolean).slice(0, 3).map((url, i) => (
                            <img
                              key={i}
                              src={url!}
                              alt="flagged content"
                              className="h-20 w-20 object-cover rounded border"
                            />
                          ))}
                        </div>
                      )}

                      {item.videoUrl && (
                        <div className="mb-3">
                          <Badge variant="secondary" className="text-xs">
                            Video content attached
                          </Badge>
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                        <Users className="h-4 w-4" />
                        <span>
                          {item.authorFirstName} {item.authorLastName}
                        </span>
                        <span className="text-xs">({item.authorEmail})</span>
                      </div>

                      {item.moderationStatus === 'pending_review' && (
                        <div className="flex gap-2 flex-wrap">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="default"
                                className="bg-green-600 hover:bg-green-700 text-white"
                                data-testid={`button-approve-${item.id}`}
                                disabled={approveMutation.isPending}
                              >
                                <ThumbsUp className="h-4 w-4 mr-1" />
                                Approve
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Approve this content?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  The post will become visible in the public feed. The flag will be cleared.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => approveMutation.mutate(item.id)}
                                  className="bg-green-600 text-white hover:bg-green-700"
                                >
                                  Approve
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="destructive"
                                data-testid={`button-reject-${item.id}`}
                                disabled={rejectMutation.isPending}
                              >
                                <ThumbsDown className="h-4 w-4 mr-1" />
                                Reject
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Reject and remove this content?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  The post will be removed from the platform. The user's violation count will increase
                                  and they may receive a warning, suspension, or ban depending on their history.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => rejectMutation.mutate(item.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Reject &amp; Remove
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => warnUserMutation.mutate(item.authorId)}
                            disabled={warnUserMutation.isPending}
                            data-testid={`button-warn-${item.id}`}
                          >
                            <AlertTriangle className="h-4 w-4 mr-1 text-yellow-600" />
                            Warn User
                          </Button>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-red-300 text-red-600 hover:bg-red-50"
                                data-testid={`button-ban-${item.id}`}
                              >
                                <Ban className="h-4 w-4 mr-1" />
                                Ban User
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Permanently ban this user?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  {item.authorFirstName} {item.authorLastName}'s account will be permanently banned.
                                  This action can be reversed from the User Management tab.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => banUserMutation.mutate(item.authorId)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Ban User
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ===================== USERS TAB ===================== */}
        <TabsContent value="users">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-heading font-semibold text-lg">User Distribution by Role</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
              <Card className="p-4 text-center">
                <div className="text-2xl font-bold">{roleStats.student}</div>
                <div className="text-sm text-muted-foreground">Students</div>
              </Card>
              <Card className="p-4 text-center">
                <div className="text-2xl font-bold">{roleStats.teacher}</div>
                <div className="text-sm text-muted-foreground">Teachers</div>
              </Card>
              <Card className="p-4 text-center">
                <div className="text-2xl font-bold">{roleStats.university_admin}</div>
                <div className="text-sm text-muted-foreground">Uni Admins</div>
              </Card>
              <Card className="p-4 text-center">
                <div className="text-2xl font-bold">{roleStats.industry_professional}</div>
                <div className="text-sm text-muted-foreground">Industry</div>
              </Card>
              <Card className="p-4 text-center">
                <div className="text-2xl font-bold">{roleStats.master_admin}</div>
                <div className="text-sm text-muted-foreground">Admins</div>
              </Card>
            </div>

            <div className="space-y-2">
              {users.slice(0, 20).map((user: any) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover-elevate"
                  data-testid={`admin-user-${user.id}`}
                >
                  <div className="flex items-center gap-3">
                    <UserAvatar user={user} size="sm" />
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        {user.firstName} {user.lastName}
                        {user.isBanned && <Badge variant="destructive" className="text-xs">Banned</Badge>}
                        {!user.isBanned && user.suspendedUntil && new Date(user.suspendedUntil) > new Date() && (
                          <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700">Suspended</Badge>
                        )}
                        {(user.violationCount ?? 0) > 0 && (
                          <Badge variant="outline" className="text-xs border-red-200 text-red-600">
                            {user.violationCount} violation{user.violationCount > 1 ? 's' : ''}
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">{user.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="capitalize">
                      {user.role.replace('_', ' ')}
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(`/profile?userId=${user.id}`)}
                      data-testid={`button-view-profile-${user.id}`}
                    >
                      View Profile
                    </Button>
                    {user.isBanned ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-green-600 border-green-300"
                        onClick={() => unbanUserMutation.mutate(user.id)}
                        disabled={unbanUserMutation.isPending}
                        data-testid={`button-unban-${user.id}`}
                      >
                        Unban
                      </Button>
                    ) : (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-orange-600 border-orange-300"
                            data-testid={`button-ban-user-${user.id}`}
                          >
                            <Ban className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Ban {user.firstName} {user.lastName}?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Their account will be permanently banned. You can unban them at any time.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => banUserMutation.mutate(user.id)}
                              className="bg-destructive text-destructive-foreground"
                            >
                              Ban
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive"
                          data-testid={`button-delete-user-${user.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete user permanently?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will completely remove {user.firstName} {user.lastName}'s account
                            and all associated data. This action is irreversible.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteUserMutation.mutate(user.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* ===================== COURSES TAB ===================== */}
        <TabsContent value="courses">
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="h-5 w-5 text-primary" />
              <h3 className="font-heading font-semibold text-lg">All Courses</h3>
              <Badge variant="secondary" className="ml-auto">{courses.length} total</Badge>
            </div>
            {coursesLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground text-sm">Loading courses...</span>
              </div>
            ) : courses.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">No courses found on the platform.</p>
            ) : (
              <div className="space-y-3">
                {courses.map((course) => (
                  <div
                    key={course.id}
                    className="flex items-start gap-4 p-4 border rounded-lg"
                    data-testid={`course-${course.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{course.name}</span>
                        <Badge variant="outline" className="text-xs font-mono">{course.code}</Badge>
                        <Badge
                          variant={course.isValidated ? 'outline' : 'secondary'}
                          className="text-xs"
                        >
                          {course.isValidated ? 'Validated' : course.status}
                        </Badge>
                      </div>
                      {course.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{course.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        Instructor: {course.instructorName ?? 'Unknown'} {course.instructorEmail ? `(${course.instructorEmail})` : ''}
                        · Created {new Date(course.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {!course.isValidated && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => validateCourseMutation.mutate(course.id)}
                          disabled={validateCourseMutation.isPending}
                          data-testid={`validate-course-${course.id}`}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" /> Validate
                        </Button>
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="destructive" data-testid={`delete-course-${course.id}`}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Course</AlertDialogTitle>
                            <AlertDialogDescription>
                              Permanently delete "{course.title}"? This cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteCourseMutation.mutate(course.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* ===================== GROUPS TAB ===================== */}
        <TabsContent value="groups">
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <UsersRound className="h-5 w-5 text-primary" />
              <h3 className="font-heading font-semibold text-lg">All Groups</h3>
              <Badge variant="secondary" className="ml-auto">{groups.length} total</Badge>
            </div>
            {groupsLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground text-sm">Loading groups...</span>
              </div>
            ) : groups.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">No groups found on the platform.</p>
            ) : (
              <div className="space-y-3">
                {groups.map((group) => (
                  <div
                    key={group.id}
                    className="flex items-start gap-4 p-4 border rounded-lg"
                    data-testid={`group-${group.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{group.name}</span>
                        <Badge variant="outline" className="text-xs capitalize">{group.groupType}</Badge>
                        <Badge variant={group.isPrivate ? 'secondary' : 'outline'} className="text-xs">
                          {group.isPrivate ? 'Private' : 'Public'}
                        </Badge>
                      </div>
                      {group.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{group.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        Created by: {group.creatorName ?? 'Unknown'}
                        {group.creatorEmail ? ` (${group.creatorEmail})` : ''}
                        · {group.memberCount} members
                        · {new Date(group.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="shrink-0">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="destructive" data-testid={`delete-group-${group.id}`}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Group</AlertDialogTitle>
                            <AlertDialogDescription>
                              Permanently delete "{group.name}"? All members and posts will be removed.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteGroupMutation.mutate(group.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* ===================== AUDIT LOGS TAB ===================== */}
        <TabsContent value="logs" className="space-y-4">
          <Card className="p-6">
            <h3 className="font-heading font-semibold text-lg mb-4">Admin Action Log</h3>
            {actionLogs.length === 0 ? (
              <p className="text-muted-foreground text-sm">No admin actions recorded yet.</p>
            ) : (
              <div className="space-y-2">
                {actionLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center gap-4 p-3 border rounded-lg text-sm"
                    data-testid={`action-log-${log.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <span className="font-medium capitalize">{log.action.replace(/_/g, ' ')}</span>
                      {log.targetType && log.targetId && (
                        <span className="text-muted-foreground">
                          {' '}on {log.targetType} <span className="font-mono text-xs">{log.targetId.slice(0, 8)}…</span>
                        </span>
                      )}
                    </div>
                    <div className="shrink-0 text-muted-foreground text-xs text-right">
                      <div>{log.adminName ?? log.adminEmail ?? 'System'}</div>
                      <div>{new Date(log.createdAt).toLocaleString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
          <Card className="p-6">
            <h3 className="font-heading font-semibold text-lg mb-4">Content Moderation Log</h3>
            {moderationLogs.length === 0 ? (
              <p className="text-muted-foreground text-sm">No moderation actions recorded yet.</p>
            ) : (
              <div className="space-y-2">
                {moderationLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center gap-4 p-3 border rounded-lg text-sm"
                    data-testid={`mod-log-${log.id}`}
                  >
                    <div className="shrink-0">
                      {log.action === 'approved' ? (
                        <ShieldCheck className="h-4 w-4 text-green-600" />
                      ) : (
                        <ShieldX className="h-4 w-4 text-red-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-medium capitalize">{log.action}</span>
                      {' '}&mdash; Post <span className="font-mono text-xs text-muted-foreground">{log.postId.slice(0, 8)}…</span>
                      {log.note && <span className="text-muted-foreground"> · {log.note}</span>}
                    </div>
                    <div className="shrink-0 text-muted-foreground text-xs">
                      {log.adminName ?? 'System'} · {new Date(log.createdAt).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* ===================== ANALYTICS TAB ===================== */}
        <TabsContent value="analytics">
          <Card className="p-6">
            <h3 className="font-heading font-semibold text-lg mb-4">Platform Analytics</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <div className="text-sm text-muted-foreground mb-1">Avg Engagement Score</div>
                <div className="text-2xl font-bold">
                  {Math.round(users.reduce((sum, u) => sum + (u.engagementScore || 0), 0) / Math.max(users.length, 1)) || 0}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Active Users (30d)</div>
                <div className="text-2xl font-bold">{users.filter(u => (u.engagementScore || 0) > 0).length}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Content Created</div>
                <div className="text-2xl font-bold">{posts.length}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Flagged Content</div>
                <div className="text-2xl font-bold text-yellow-600">{flaggedContent.length}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Moderation Actions</div>
                <div className="text-2xl font-bold">{moderationLogs.length}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Banned Users</div>
                <div className="text-2xl font-bold text-red-600">{bannedUsers}</div>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
