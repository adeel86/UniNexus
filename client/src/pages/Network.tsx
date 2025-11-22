import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { User, UserConnection, Follower } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserAvatar } from "@/components/UserAvatar";
import { Badge } from "@/components/ui/badge";
import { Search, UserPlus, UserCheck, UserX, Users, UserMinus, Heart } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

interface ConnectionWithUser extends UserConnection {
  user: User;
}

interface FollowerWithUser extends Follower {
  follower: User;
  following: User;
}

export default function Network() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");

  // Get all connections
  const { data: acceptedConnections = [] } = useQuery<ConnectionWithUser[]>({
    queryKey: ["/api/connections", "accepted"],
    queryFn: async () => {
      const res = await fetch("/api/connections?status=accepted", {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('dev_token')}`,
        },
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch connections");
      return res.json();
    },
  });

  // Get pending requests (received)
  const { data: pendingRequests = [] } = useQuery<ConnectionWithUser[]>({
    queryKey: ["/api/connections", "pending"],
    queryFn: async () => {
      const res = await fetch("/api/connections?status=pending", {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('dev_token')}`,
        },
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch pending requests");
      return res.json();
    },
  });

  // Get followers (people following me)
  const { data: followers = [] } = useQuery<FollowerWithUser[]>({
    queryKey: ["/api/followers/me"],
  });

  // Get following (people I'm following)
  const { data: following = [] } = useQuery<FollowerWithUser[]>({
    queryKey: ["/api/following/me"],
  });

  // Search within connected users only
  const { data: searchResults = [] } = useQuery<User[]>({
    queryKey: ["/api/connections/search", { q: searchTerm }],
    enabled: searchTerm.length > 2,
  });

  // Send connection request
  const sendRequest = useMutation({
    mutationFn: async (receiverId: string) => {
      return await apiRequest("POST", "/api/connections/request", { receiverId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/connections"] });
      toast({
        title: "Connection request sent",
        description: "Your request has been sent successfully",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to send connection request",
      });
    },
  });

  // Accept/reject connection request
  const respondToRequest = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return await apiRequest("PATCH", `/api/connections/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/connections"] });
      toast({
        title: "Request updated",
        description: "Connection request has been updated",
      });
    },
  });

  // Follow user
  const followUser = useMutation({
    mutationFn: async (followingId: string) => {
      return await apiRequest("POST", "/api/follow", { followingId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/followers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/following"] });
      toast({
        title: "Following",
        description: "You are now following this user",
      });
    },
  });

  // Unfollow user
  const unfollowUser = useMutation({
    mutationFn: async (userId: string) => {
      return await apiRequest("DELETE", `/api/follow/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/followers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/following"] });
      toast({
        title: "Unfollowed",
        description: "You have unfollowed this user",
      });
    },
  });

  // Filter pending requests (only received ones)
  const receivedRequests = pendingRequests.filter(
    req => req.receiverId !== req.user?.id
  );

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="font-heading text-3xl font-bold mb-2">My Network</h1>
        <p className="text-muted-foreground">
          Connect with students, teachers, and industry professionals
        </p>
      </div>

      {/* Search Bar */}
      <Card className="p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search for people to connect with..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            data-testid="input-search-network"
          />
        </div>

        {/* Search Results */}
        {searchTerm.length > 2 && (
          <div className="mt-4 space-y-2">
            {searchResults.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No users found
              </p>
            ) : (
              searchResults.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-3 rounded-md hover-elevate active-elevate-2"
                  data-testid={`search-result-${user.id}`}
                >
                  <div className="flex items-center gap-3">
                    <UserAvatar user={user} size="md" />
                    <div>
                      <p className="font-medium">
                        {user.firstName} {user.lastName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {user.role === 'student' && user.major}
                        {user.role === 'teacher' && 'Teacher'}
                        {user.role === 'industry_professional' && user.company}
                        {user.role === 'university_admin' && user.university}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => sendRequest.mutate(user.id)}
                    disabled={sendRequest.isPending}
                    data-testid={`button-connect-${user.id}`}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Connect
                  </Button>
                </div>
              ))
            )}
          </div>
        )}
      </Card>

      {/* Tabs for Connections, Requests, Followers, and Following */}
      <Tabs defaultValue="connections" className="w-full">
        <TabsList className="grid w-full grid-cols-4 gap-2">
          <TabsTrigger value="connections" data-testid="tab-connections">
            <Users className="h-4 w-4 mr-2" />
            Connections ({acceptedConnections.length})
          </TabsTrigger>
          <TabsTrigger value="requests" data-testid="tab-requests">
            <UserPlus className="h-4 w-4 mr-2" />
            Requests ({receivedRequests.length})
          </TabsTrigger>
          <TabsTrigger value="followers" data-testid="tab-followers">
            <Heart className="h-4 w-4 mr-2" />
            Followers ({followers.length})
          </TabsTrigger>
          <TabsTrigger value="following" data-testid="tab-following">
            <UserCheck className="h-4 w-4 mr-2" />
            Following ({following.length})
          </TabsTrigger>
        </TabsList>

        {/* Connections Tab */}
        <TabsContent value="connections" className="mt-6">
          {acceptedConnections.length === 0 ? (
            <Card className="p-8 text-center">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="font-semibold text-lg mb-2">No connections yet</h3>
              <p className="text-muted-foreground mb-4">
                Start building your network by connecting with people
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {acceptedConnections.map((connection) => (
                <Card
                  key={connection.id}
                  className="p-4 hover-elevate"
                  data-testid={`connection-card-${connection.id}`}
                >
                  <div className="flex items-start gap-3">
                    <UserAvatar user={connection.user} size="lg" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {connection.user.firstName} {connection.user.lastName}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {connection.user.role === 'student' && connection.user.major}
                        {connection.user.role === 'teacher' && 'Teacher'}
                        {connection.user.role === 'industry_professional' && connection.user.company}
                        {connection.user.role === 'university_admin' && connection.user.university}
                      </p>
                      <Badge variant="secondary" className="mt-2">
                        {connection.user.role.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => window.location.href = `/profile?userId=${connection.user.id}`}
                      data-testid={`button-view-profile-${connection.id}`}
                    >
                      View Profile
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => window.location.href = `/messages?userId=${connection.user.id}`}
                      data-testid={`button-message-${connection.id}`}
                    >
                      Message
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Requests Tab */}
        <TabsContent value="requests" className="mt-6">
          {receivedRequests.length === 0 ? (
            <Card className="p-8 text-center">
              <UserPlus className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="font-semibold text-lg mb-2">No pending requests</h3>
              <p className="text-muted-foreground">
                You have no connection requests at the moment
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {receivedRequests.map((request) => (
                <Card
                  key={request.id}
                  className="p-4"
                  data-testid={`request-card-${request.id}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <UserAvatar user={request.user} size="md" />
                      <div>
                        <p className="font-medium">
                          {request.user.firstName} {request.user.lastName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {request.user.role === 'student' && request.user.major}
                          {request.user.role === 'teacher' && 'Teacher'}
                          {request.user.role === 'industry_professional' && request.user.company}
                          {request.user.role === 'university_admin' && request.user.university}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => respondToRequest.mutate({ id: request.id, status: 'accepted' })}
                        disabled={respondToRequest.isPending}
                        data-testid={`button-accept-${request.id}`}
                      >
                        <UserCheck className="h-4 w-4 mr-2" />
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => respondToRequest.mutate({ id: request.id, status: 'rejected' })}
                        disabled={respondToRequest.isPending}
                        data-testid={`button-reject-${request.id}`}
                      >
                        <UserX className="h-4 w-4 mr-2" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Followers Tab */}
        <TabsContent value="followers" className="mt-6">
          {followers.length === 0 ? (
            <Card className="p-8 text-center">
              <Heart className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="font-semibold text-lg mb-2">No followers yet</h3>
              <p className="text-muted-foreground">
                Share great content to gain followers
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {followers.map((follow) => (
                <Card
                  key={follow.id}
                  className="p-4 hover-elevate"
                  data-testid={`follower-card-${follow.id}`}
                >
                  <div className="flex items-start gap-3">
                    <UserAvatar user={follow.follower} size="lg" />
                    <div className="flex-1 min-w-0">
                      <Link href={`/profile?userId=${follow.follower.id}`}>
                        <p className="font-medium truncate hover:text-primary cursor-pointer">
                          {follow.follower.firstName} {follow.follower.lastName}
                        </p>
                      </Link>
                      <p className="text-sm text-muted-foreground truncate">
                        {follow.follower.role === 'student' && follow.follower.major}
                        {follow.follower.role === 'teacher' && 'Teacher'}
                        {follow.follower.role === 'industry_professional' && follow.follower.company}
                        {follow.follower.role === 'university_admin' && follow.follower.university}
                      </p>
                      <Badge variant="secondary" className="mt-2">
                        {follow.follower.role.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => followUser.mutate(follow.follower.id)}
                      disabled={followUser.isPending}
                      data-testid={`button-follow-back-${follow.id}`}
                    >
                      Follow Back
                    </Button>
                    <Link href={`/profile?userId=${follow.follower.id}`}>
                      <Button
                        variant="outline"
                        size="sm"
                        data-testid={`button-view-follower-${follow.id}`}
                      >
                        View
                      </Button>
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Following Tab */}
        <TabsContent value="following" className="mt-6">
          {following.length === 0 ? (
            <Card className="p-8 text-center">
              <UserCheck className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="font-semibold text-lg mb-2">Not following anyone</h3>
              <p className="text-muted-foreground">
                Discover people to follow in the Discovery page
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {following.map((follow) => (
                <Card
                  key={follow.id}
                  className="p-4 hover-elevate"
                  data-testid={`following-card-${follow.id}`}
                >
                  <div className="flex items-start gap-3">
                    <UserAvatar user={follow.following} size="lg" />
                    <div className="flex-1 min-w-0">
                      <Link href={`/profile?userId=${follow.following.id}`}>
                        <p className="font-medium truncate hover:text-primary cursor-pointer">
                          {follow.following.firstName} {follow.following.lastName}
                        </p>
                      </Link>
                      <p className="text-sm text-muted-foreground truncate">
                        {follow.following.role === 'student' && follow.following.major}
                        {follow.following.role === 'teacher' && 'Teacher'}
                        {follow.following.role === 'industry_professional' && follow.following.company}
                        {follow.following.role === 'university_admin' && follow.following.university}
                      </p>
                      <Badge variant="secondary" className="mt-2">
                        {follow.following.role.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => unfollowUser.mutate(follow.following.id)}
                      disabled={unfollowUser.isPending}
                      data-testid={`button-unfollow-${follow.id}`}
                    >
                      <UserMinus className="h-4 w-4 mr-2" />
                      Unfollow
                    </Button>
                    <Link href={`/profile?userId=${follow.following.id}`}>
                      <Button
                        variant="outline"
                        size="sm"
                        data-testid={`button-view-following-${follow.id}`}
                      >
                        View
                      </Button>
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
