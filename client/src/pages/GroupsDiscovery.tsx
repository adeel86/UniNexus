import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { Group, GroupMember } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Search, Users, BookOpen, Code, Dumbbell, Sparkles, Plus, Check } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/useDebounce";

type GroupWithMembership = Group & {
  isMember?: boolean;
};

const groupTypes = [
  { value: "all", label: "All Groups", icon: Sparkles },
  { value: "subject", label: "Subject", icon: BookOpen },
  { value: "skill", label: "Skill", icon: Code },
  { value: "hobby", label: "Hobby", icon: Dumbbell },
  { value: "study_group", label: "Study Group", icon: Users },
];

export default function GroupsDiscovery() {
  const { userData: user } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  
  // Debounce search query to avoid excessive API calls
  const debouncedSearch = useDebounce(searchQuery, 500);

  // Fetch groups
  const { data: groups = [], isLoading } = useQuery<Group[]>({
    queryKey: ["/api/groups", selectedType, debouncedSearch],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedType && selectedType !== "all") {
        params.set("type", selectedType);
      }
      if (debouncedSearch.trim()) {
        params.set("search", debouncedSearch.trim());
      }
      const response = await fetch(`/api/groups?${params}`);
      if (!response.ok) throw new Error("Failed to fetch groups");
      return response.json();
    },
  });

  // Check user's memberships
  const { data: myMemberships = [] } = useQuery<Array<{ membership: GroupMember; group: Group }>>({
    queryKey: ["/api/users/groups", user?.id],
    queryFn: async () => {
      const response = await fetch("/api/users/groups");
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!user,
  });

  const myGroupIds = new Set(myMemberships.map(m => m.membership.groupId));

  // Join group mutation
  const joinMutation = useMutation({
    mutationFn: async (groupId: string) => {
      return apiRequest("POST", `/api/groups/${groupId}/join`);
    },
    onSuccess: (_, groupId) => {
      toast({
        title: "Success",
        description: "You've joined the group!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/groups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/groups", groupId] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to join group",
        variant: "destructive",
      });
    },
  });

  // Leave group mutation
  const leaveMutation = useMutation({
    mutationFn: async (groupId: string) => {
      return apiRequest("DELETE", `/api/groups/${groupId}/leave`);
    },
    onSuccess: (_, groupId) => {
      toast({
        title: "Success",
        description: "You've left the group",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/groups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/groups", groupId] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to leave group",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="font-heading text-3xl font-bold mb-2 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
          Discover Groups
        </h1>
        <p className="text-muted-foreground">
          Find and join communities that match your interests
        </p>
      </div>

      {/* Search and Filters */}
      <Card className="p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search groups by name or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-groups"
            />
          </div>
        </div>

        {/* Type Filter Tabs */}
        <Tabs value={selectedType} onValueChange={setSelectedType} className="mt-4">
          <TabsList className="grid grid-cols-5 w-full">
            {groupTypes.map((type) => (
              <TabsTrigger
                key={type.value}
                value={type.value}
                className="flex items-center gap-2"
                data-testid={`tab-${type.value}`}
              >
                <type.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{type.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </Card>

      {/* Groups Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="p-6 animate-pulse">
              <div className="h-4 bg-muted rounded w-3/4 mb-4" />
              <div className="h-3 bg-muted rounded w-full mb-2" />
              <div className="h-3 bg-muted rounded w-2/3" />
            </Card>
          ))}
        </div>
      ) : groups.length === 0 ? (
        <Card className="p-12 text-center">
          <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="font-semibold text-lg mb-2">No groups found</h3>
          <p className="text-muted-foreground mb-4">
            {debouncedSearch
              ? "Try adjusting your search or filters"
              : "Be the first to create a group!"}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((group) => {
            const isMember = myGroupIds.has(group.id);
            const isJoining = joinMutation.isPending;
            const isLeaving = leaveMutation.isPending;

            return (
              <Card
                key={group.id}
                className="p-6 hover-elevate"
                data-testid={`group-card-${group.id}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-heading text-lg font-semibold mb-1 line-clamp-1">
                      {group.name}
                    </h3>
                    <Badge variant="secondary" className="mb-2">
                      {group.groupType?.replace("_", " ")}
                    </Badge>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                  {group.description}
                </p>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>{group.memberCount || 0} members</span>
                  </div>

                  {isMember ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => leaveMutation.mutate(group.id)}
                      disabled={isLeaving}
                      data-testid={`button-leave-${group.id}`}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      {isLeaving ? "Leaving..." : "Joined"}
                    </Button>
                  ) : (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => joinMutation.mutate(group.id)}
                      disabled={isJoining}
                      data-testid={`button-join-${group.id}`}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      {isJoining ? "Joining..." : "Join"}
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
