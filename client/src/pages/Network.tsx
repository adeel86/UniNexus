import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { User, UserConnection } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserAvatar } from "@/components/UserAvatar";
import { Badge } from "@/components/ui/badge";
import { Search, UserPlus, UserCheck, UserX, Users } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ConnectionWithUser extends UserConnection {
  user: User;
}

export default function Network() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");

  // Get all connections
  const { data: acceptedConnections = [] } = useQuery<ConnectionWithUser[]>({
    queryKey: ["/api/connections", { status: "accepted" }],
  });

  // Get pending requests (received)
  const { data: pendingRequests = [] } = useQuery<ConnectionWithUser[]>({
    queryKey: ["/api/connections", { status: "pending" }],
  });

  // Search for users to connect with
  const { data: searchResults = [] } = useQuery<User[]>({
    queryKey: ["/api/users/search", searchTerm],
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

      {/* Tabs for Connections and Requests */}
      <Tabs defaultValue="connections" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="connections" data-testid="tab-connections">
            <Users className="h-4 w-4 mr-2" />
            My Connections ({acceptedConnections.length})
          </TabsTrigger>
          <TabsTrigger value="requests" data-testid="tab-requests">
            <UserPlus className="h-4 w-4 mr-2" />
            Requests ({receivedRequests.length})
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
      </Tabs>
    </div>
  );
}
