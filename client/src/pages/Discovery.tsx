import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { User } from "@shared/schema";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserAvatar } from "@/components/UserAvatar";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  UserPlus,
  MapPin,
  Briefcase,
  GraduationCap,
  Building2,
  Filter,
  Users,
  Sparkles,
  Building,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";

type RoleFilter = "all" | "student" | "teacher" | "industry_professional" | "university_admin";

interface FriendRecommendation extends User {
  mutualConnections: number;
  sharedSkills: string[];
  recommendationScore: number;
}

interface UniversityDiscovery {
  university: string;
  studentCount: number;
  topMajors: string[];
  avgEngagementScore: number;
}

export default function Discovery() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");

  const { data: searchResults = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/users/search", { q: searchTerm, role: roleFilter }],
    enabled: searchTerm.length > 2,
  });

  const { data: friendRecommendations = [], isLoading: recommendationsLoading } = useQuery<FriendRecommendation[]>({
    queryKey: ["/api/recommendations/friends"],
  });

  const { data: universities = [], isLoading: universitiesLoading } = useQuery<UniversityDiscovery[]>({
    queryKey: ["/api/discovery/universities"],
  });

  const sendConnectionRequest = useMutation({
    mutationFn: async (receiverId: string) => {
      return await apiRequest("POST", "/api/connections/request", { receiverId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/connections"] });
      queryClient.invalidateQueries({ queryKey: ["/api/recommendations/friends"] });
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

  const followUser = useMutation({
    mutationFn: async (followingId: string) => {
      return await apiRequest("POST", "/api/follow", { followingId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/followers"] });
      toast({
        title: "Following",
        description: "You are now following this user",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to follow user",
      });
    },
  });

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "student":
        return <GraduationCap className="h-4 w-4" />;
      case "teacher":
        return <Building2 className="h-4 w-4" />;
      case "industry_professional":
        return <Briefcase className="h-4 w-4" />;
      case "university_admin":
        return <Building2 className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "student":
        return "default";
      case "teacher":
        return "secondary";
      case "industry_professional":
        return "outline";
      default:
        return "secondary";
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="font-heading text-3xl font-bold mb-2">Discover People</h1>
        <p className="text-muted-foreground">
          Find and connect with students, teachers, and industry professionals
        </p>
      </div>

      {/* People You May Know Section */}
      {searchTerm.length < 3 && (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-primary" />
              People You May Know
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recommendationsLoading ? (
              <div className="flex gap-4 overflow-x-auto pb-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex-shrink-0 w-64">
                    <Skeleton className="h-40 w-full rounded-lg" />
                  </div>
                ))}
              </div>
            ) : friendRecommendations.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Users className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>Connect with more people to get recommendations</p>
              </div>
            ) : (
              <div className="flex gap-4 overflow-x-auto pb-2">
                {friendRecommendations.slice(0, 6).map((user) => (
                  <Card
                    key={user.id}
                    className="flex-shrink-0 w-64 hover-elevate"
                    data-testid={`recommendation-${user.id}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <UserAvatar user={user} size="md" />
                        <div className="flex-1 min-w-0">
                          <Link href={`/profile?userId=${user.id}`}>
                            <h4 className="font-semibold text-sm hover:text-primary cursor-pointer truncate">
                              {user.firstName} {user.lastName}
                            </h4>
                          </Link>
                          <p className="text-xs text-muted-foreground truncate">
                            {user.major || user.position || "Member"}
                          </p>
                        </div>
                      </div>
                      {user.mutualConnections > 0 && (
                        <p className="text-xs text-muted-foreground mb-2">
                          <Users className="h-3 w-3 inline mr-1" />
                          {user.mutualConnections} mutual connection{user.mutualConnections > 1 ? "s" : ""}
                        </p>
                      )}
                      {user.sharedSkills && user.sharedSkills.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {user.sharedSkills.slice(0, 2).map((skill, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      )}
                      <Button
                        size="sm"
                        className="w-full"
                        onClick={() => sendConnectionRequest.mutate(user.id)}
                        disabled={sendConnectionRequest.isPending}
                        data-testid={`button-connect-rec-${user.id}`}
                      >
                        <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                        Connect
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Universities to Explore Section */}
      {searchTerm.length < 3 && (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building className="h-5 w-5 text-primary" />
              Universities to Explore
            </CardTitle>
          </CardHeader>
          <CardContent>
            {universitiesLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-28 w-full rounded-lg" />
                ))}
              </div>
            ) : universities.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Building className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>No universities to explore yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {universities.slice(0, 6).map((uni, idx) => (
                  <Card
                    key={idx}
                    className="hover-elevate cursor-pointer"
                    onClick={() => setSearchTerm(uni.university)}
                    data-testid={`university-${idx}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h4 className="font-semibold text-sm">{uni.university}</h4>
                        <Badge variant="secondary" className="text-xs">
                          {uni.studentCount} students
                        </Badge>
                      </div>
                      {uni.topMajors && uni.topMajors.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {uni.topMajors.slice(0, 2).map((major, midx) => (
                            <Badge key={midx} variant="outline" className="text-xs">
                              {major}
                            </Badge>
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Avg. Engagement: {Math.round(uni.avgEngagementScore || 0)}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Search Section */}
      <Card className="p-4 mb-6">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, university, major, or company..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-testid="input-search-discovery"
              />
            </div>
            <div className="flex gap-2">
              <Select
                value={roleFilter}
                onValueChange={(value) => setRoleFilter(value as RoleFilter)}
              >
                <SelectTrigger className="w-48" data-testid="select-role-filter">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="student">Students</SelectItem>
                  <SelectItem value="teacher">Teachers</SelectItem>
                  <SelectItem value="industry_professional">Industry Pros</SelectItem>
                  <SelectItem value="university_admin">Admins</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Search className="h-3 w-3" />
              Try: "Stanford", "AI", "Google", or a person's name
            </span>
          </div>
        </div>
      </Card>

      {searchTerm.length < 3 && (
        <Card className="p-12 text-center">
          <Search className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="font-semibold text-xl mb-2">Start exploring</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            Enter a search term (at least 3 characters) to discover students, teachers,
            and industry professionals across the UniNexus platform
          </p>
        </Card>
      )}

      {searchTerm.length >= 3 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {isLoading
                ? "Searching..."
                : `Found ${searchResults.length} ${searchResults.length === 1 ? "person" : "people"}`}
            </p>
          </div>

          {searchResults.length === 0 && !isLoading ? (
            <Card className="p-12 text-center">
              <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="font-semibold text-lg mb-2">No results found</h3>
              <p className="text-muted-foreground">
                Try adjusting your search term or filters
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {searchResults.map((user) => (
                <Card
                  key={user.id}
                  className="overflow-hidden hover-elevate"
                  data-testid={`user-card-${user.id}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3 mb-3">
                      <UserAvatar user={user} size="lg" />
                      <div className="flex-1 min-w-0">
                        <Link href={`/profile?userId=${user.id}`}>
                          <h3 className="font-semibold hover:text-primary cursor-pointer truncate">
                            {user.firstName} {user.lastName}
                          </h3>
                        </Link>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                          {getRoleIcon(user.role)}
                          <span className="truncate">
                            {user.role === "student" && user.major}
                            {user.role === "teacher" && "Educator"}
                            {user.role === "industry_professional" && user.position}
                            {user.role === "university_admin" && "Administrator"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mb-3">
                      <Badge variant={getRoleBadgeVariant(user.role)} className="text-xs">
                        {user.role.replace("_", " ")}
                      </Badge>
                      {user.university && (
                        <Badge variant="outline" className="text-xs">
                          <MapPin className="h-3 w-3 mr-1" />
                          {user.university}
                        </Badge>
                      )}
                      {user.company && (
                        <Badge variant="outline" className="text-xs">
                          <Briefcase className="h-3 w-3 mr-1" />
                          {user.company}
                        </Badge>
                      )}
                    </div>

                    {user.bio && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                        {user.bio}
                      </p>
                    )}

                    {user.interests && user.interests.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {user.interests.slice(0, 3).map((interest, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {interest}
                          </Badge>
                        ))}
                        {user.interests.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{user.interests.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}
                  </CardContent>

                  <CardFooter className="p-4 pt-0 flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => sendConnectionRequest.mutate(user.id)}
                      disabled={sendConnectionRequest.isPending}
                      data-testid={`button-connect-${user.id}`}
                    >
                      <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                      Connect
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => followUser.mutate(user.id)}
                      disabled={followUser.isPending}
                      data-testid={`button-follow-${user.id}`}
                    >
                      Follow
                    </Button>
                    <Link href={`/profile?userId=${user.id}`}>
                      <Button size="sm" variant="ghost" data-testid={`button-view-${user.id}`}>
                        View
                      </Button>
                    </Link>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
