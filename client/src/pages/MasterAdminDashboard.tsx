import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { User, Post } from "@shared/schema";
import { Users, FileText, Shield, TrendingUp, AlertTriangle, CheckCircle, Trash2 } from "lucide-react";
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

export default function MasterAdminDashboard() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
  });

  const { data: posts = [] } = useQuery<Post[]>({
    queryKey: ["/api/admin/posts"],
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest("DELETE", `/api/admin/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "User deleted",
        description: "The user has been permanently removed from the platform.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Deletion failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const roleStats = {
    student: users.filter(u => u.role === 'student').length,
    teacher: users.filter(u => u.role === 'teacher').length,
    university_admin: users.filter(u => u.role === 'university_admin').length,
    industry_partner: users.filter(u => u.role === 'industry_partner').length,
    master_admin: users.filter(u => u.role === 'master_admin').length,
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="font-heading text-3xl font-bold mb-2">Master Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Full platform control and moderation
        </p>
      </div>

      {/* Overview Stats */}
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
              <p className="text-sm text-muted-foreground">Flagged Content</p>
              <p className="text-3xl font-bold">0</p>
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

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList>
          <TabsTrigger value="users" data-testid="tab-users">User Management</TabsTrigger>
          <TabsTrigger value="content" data-testid="tab-content">Content Moderation</TabsTrigger>
          <TabsTrigger value="analytics" data-testid="tab-analytics">Analytics</TabsTrigger>
        </TabsList>

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
                <div className="text-2xl font-bold">{roleStats.industry_partner}</div>
                <div className="text-sm text-muted-foreground">Industry</div>
              </Card>
              <Card className="p-4 text-center">
                <div className="text-2xl font-bold">{roleStats.master_admin}</div>
                <div className="text-sm text-muted-foreground">Admins</div>
              </Card>
            </div>

            <div className="space-y-2">
              {users.slice(0, 10).map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover-elevate"
                  data-testid={`admin-user-${user.id}`}
                >
                  <div className="flex items-center gap-3">
                    <UserAvatar user={user} size="sm" />
                    <div>
                      <div className="font-medium">
                        {user.firstName} {user.lastName}
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

        <TabsContent value="content">
          <Card className="p-6">
            <h3 className="font-heading font-semibold text-lg mb-4">Recent Posts</h3>
            <div className="space-y-3">
              {posts.slice(0, 10).map((post) => (
                <div
                  key={post.id}
                  className="border rounded-lg p-4 hover-elevate"
                  data-testid={`admin-post-${post.id}`}
                >
                  <p className="line-clamp-2 mb-2">{post.content}</p>
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">
                      {post.category && (
                        <Badge variant="secondary" className="capitalize mr-2">
                          {post.category}
                        </Badge>
                      )}
                      {post.viewCount} views
                    </div>
                    <Button size="sm" variant="outline" data-testid={`button-review-${post.id}`}>
                      Review
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <Card className="p-6">
            <h3 className="font-heading font-semibold text-lg mb-4">Platform Analytics</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <div className="text-sm text-muted-foreground mb-1">Avg Engagement Score</div>
                <div className="text-2xl font-bold">
                  {Math.round(users.reduce((sum, u) => sum + (u.engagementScore || 0), 0) / users.length) || 0}
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
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
