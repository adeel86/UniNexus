import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import type { Group, GroupMember, User } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UserAvatar } from "@/components/UserAvatar";
import { 
  Users, 
  ArrowLeft, 
  Lock, 
  Globe, 
  Send, 
  MessageSquare,
  Crown,
  Shield,
  User as UserIcon
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

type GroupPost = {
  id: string;
  content: string;
  createdAt: string;
  author: User;
};

type GroupMemberWithUser = {
  membership: GroupMember;
  user: User;
};

export default function GroupPage() {
  const { id: groupId } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { userData: user } = useAuth();
  const { toast } = useToast();
  const [newPostContent, setNewPostContent] = useState("");
  

  const { data: group, isLoading: groupLoading } = useQuery<Group>({
    queryKey: ["/api/groups", groupId],
    enabled: !!groupId,
  });

  const { data: members = [], isLoading: membersLoading } = useQuery<GroupMemberWithUser[]>({
    queryKey: ["/api/groups", groupId, "members"],
    enabled: !!groupId,
  });

  const { data: posts = [], isLoading: postsLoading } = useQuery<GroupPost[]>({
    queryKey: ["/api/groups", groupId, "posts"],
    enabled: !!groupId,
  });

  const { data: myMemberships = [], isLoading: membershipLoading } = useQuery<Array<{ membership: GroupMember; group: Group }>>({
    queryKey: ["/api/users/groups"],
    enabled: !!user,
  });

  const joinMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/groups/${groupId}/join`);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "You've joined the group!" });
      queryClient.invalidateQueries({ queryKey: ["/api/groups", groupId] });
      queryClient.invalidateQueries({ queryKey: ["/api/groups", groupId, "members"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/groups"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to join group", variant: "destructive" });
    },
  });

  const leaveMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/groups/${groupId}/leave`);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "You've left the group" });
      queryClient.invalidateQueries({ queryKey: ["/api/groups", groupId] });
      queryClient.invalidateQueries({ queryKey: ["/api/groups", groupId, "members"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/groups"] });
      navigate("/groups");
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to leave group", 
        variant: "destructive" 
      });
    },
  });

  const createPostMutation = useMutation({
    mutationFn: async (content: string) => {
      return apiRequest("POST", `/api/groups/${groupId}/posts`, { content });
    },
    onSuccess: () => {
      toast({ title: "Posted!", description: "Your post has been shared with the group" });
      setNewPostContent("");
      queryClient.invalidateQueries({ queryKey: ["/api/groups", groupId, "posts"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to post", variant: "destructive" });
    },
  });

  const handleCreatePost = () => {
    if (!newPostContent.trim()) return;
    createPostMutation.mutate(newPostContent);
  };

  const myMembership = members.find(m => m.user?.id === user?.id);
  const isMemberFromList = myMemberships.some(m => m.membership.groupId === groupId);
  const isMemberFromMembers = !!myMembership;
  const isMember = isMemberFromList || isMemberFromMembers;

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge variant="default" className="gap-1"><Crown className="h-3 w-3" /> Admin</Badge>;
      case 'moderator':
        return <Badge variant="secondary" className="gap-1"><Shield className="h-3 w-3" /> Moderator</Badge>;
      default:
        return <Badge variant="outline" className="gap-1"><UserIcon className="h-3 w-3" /> Member</Badge>;
    }
  };

  const isLoadingGroupData = groupLoading || (user && (membershipLoading || membersLoading));

  if (isLoadingGroupData) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-5xl">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading group...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-5xl">
        <Card className="p-12 text-center">
          <h2 className="text-2xl font-bold mb-2">Group Not Found</h2>
          <p className="text-muted-foreground mb-4">This group doesn't exist or has been deleted.</p>
          <Button onClick={() => navigate("/groups")} data-testid="button-back-to-groups">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Groups
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl">
      <Button 
        variant="ghost" 
        onClick={() => navigate("/groups")} 
        className="mb-4"
        data-testid="button-back-to-groups"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Groups
      </Button>

      <Card className="mb-6">
        {group.coverImageUrl && (
          <div 
            className="h-48 bg-cover bg-center rounded-t-lg"
            style={{ backgroundImage: `url(${group.coverImageUrl})` }}
          />
        )}
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <CardTitle className="text-2xl">{group.name}</CardTitle>
                {group.isPrivate ? (
                  <Badge variant="secondary" className="gap-1">
                    <Lock className="h-3 w-3" /> Private
                  </Badge>
                ) : (
                  <Badge variant="outline" className="gap-1">
                    <Globe className="h-3 w-3" /> Public
                  </Badge>
                )}
                <Badge variant="outline">{group.groupType}</Badge>
                {group.category && <Badge>{group.category}</Badge>}
              </div>
              <CardDescription className="text-base">
                {group.description || "No description available"}
              </CardDescription>
              <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {group.memberCount} members
                </div>
                {group.university && (
                  <span>{group.university}</span>
                )}
              </div>
            </div>
            <div>
              {isMember ? (
                <Button 
                  variant="outline" 
                  onClick={() => leaveMutation.mutate()}
                  disabled={leaveMutation.isPending}
                  data-testid="button-leave-group"
                >
                  Leave Group
                </Button>
              ) : (
                <Button 
                  onClick={() => joinMutation.mutate()}
                  disabled={joinMutation.isPending}
                  data-testid="button-join-group"
                >
                  Join Group
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="posts" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="posts" data-testid="tab-posts">
            <MessageSquare className="h-4 w-4 mr-2" />
            Posts
          </TabsTrigger>
          <TabsTrigger value="members" data-testid="tab-members">
            <Users className="h-4 w-4 mr-2" />
            Members ({members.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="posts">
          {isMember && (
            <Card className="mb-4">
              <CardContent className="pt-4">
                <Textarea
                  placeholder="Share something with the group..."
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  className="mb-3"
                  data-testid="textarea-new-post"
                />
                <div className="flex justify-end">
                  <Button 
                    onClick={handleCreatePost}
                    disabled={!newPostContent.trim() || createPostMutation.isPending}
                    data-testid="button-create-post"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Post
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {!isMember && (
            <Card className="mb-4 p-6 text-center">
              <p className="text-muted-foreground">Join this group to post and interact with members</p>
            </Card>
          )}

          {postsLoading ? (
            <div className="text-center py-8">
              <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : posts.length === 0 ? (
            <Card className="p-8 text-center">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No posts yet. Be the first to share something!</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <Card key={post.id} data-testid={`post-${post.id}`}>
                  <CardContent className="pt-4">
                    <div className="flex gap-3">
                      <UserAvatar user={post.author} size="md" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">
                            {post.author?.firstName} {post.author?.lastName}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {post.createdAt && formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-sm">{post.content}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="members">
          {membersLoading ? (
            <div className="text-center py-8">
              <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : members.length === 0 ? (
            <Card className="p-8 text-center">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No members yet</p>
            </Card>
          ) : (
            <Card>
              <ScrollArea className="h-[400px]">
                <div className="p-4 space-y-3">
                  {members.map((member) => member.user && (
                    <div 
                      key={member.membership.id}
                      className="flex items-center justify-between p-3 rounded-lg hover-elevate"
                      data-testid={`member-${member.user.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <UserAvatar user={member.user} size="md" />
                        <div>
                          <p className="font-medium">
                            {member.user.firstName} {member.user.lastName}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {member.user.major || member.user.role}
                          </p>
                        </div>
                      </div>
                      {getRoleBadge(member.membership.role)}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
