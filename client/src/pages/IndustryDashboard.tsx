import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";
import { UserAvatar } from "@/components/UserAvatar";
import { Badge } from "@/components/ui/badge";
import { Search, Briefcase, Users, Trophy, Plus } from "lucide-react";
import { useState } from "react";

export default function IndustryDashboard() {
  const [searchTerm, setSearchTerm] = useState("");
  const [skillFilter, setSkillFilter] = useState("");

  const { data: students = [] } = useQuery<User[]>({
    queryKey: ["/api/students"],
  });

  const filteredStudents = students
    .filter(s => {
      const searchLower = searchTerm.toLowerCase();
      return (
        s.firstName?.toLowerCase().includes(searchLower) ||
        s.lastName?.toLowerCase().includes(searchLower) ||
        s.major?.toLowerCase().includes(searchLower)
      );
    })
    .sort((a, b) => (b.engagementScore || 0) - (a.engagementScore || 0));

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="font-heading text-3xl font-bold mb-2">Industry Partner Dashboard</h1>
        <p className="text-muted-foreground">
          Discover talented students and create challenges
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Available Talent</p>
              <p className="text-3xl font-bold">{students.length}</p>
            </div>
            <Users className="h-8 w-8 text-primary" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Active Challenges</p>
              <p className="text-3xl font-bold">3</p>
            </div>
            <Trophy className="h-8 w-8 text-yellow-600" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Applications</p>
              <p className="text-3xl font-bold">42</p>
            </div>
            <Briefcase className="h-8 w-8 text-blue-600" />
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-purple-600 to-pink-600 text-white">
          <Button
            className="w-full bg-white/20 hover:bg-white/30 text-white"
            size="lg"
            data-testid="button-create-challenge"
          >
            <Plus className="mr-2 h-5 w-5" />
            Create Challenge
          </Button>
        </Card>
      </div>

      {/* Talent Discovery */}
      <Card className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search by name, major, or skills..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search-talent"
              />
            </div>
          </div>
          <Button variant="outline" data-testid="button-filter">
            <Trophy className="mr-2 h-4 w-4" />
            Top Performers
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredStudents.map((student) => (
            <Card
              key={student.id}
              className="p-5 hover-elevate active-elevate-2 cursor-pointer"
              data-testid={`talent-${student.id}`}
            >
              <div className="flex items-start gap-4">
                <UserAvatar user={student} size="lg" />
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">
                        {student.firstName} {student.lastName}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {student.major || "No major specified"}
                      </p>
                      {student.university && (
                        <p className="text-xs text-muted-foreground">
                          {student.university}
                        </p>
                      )}
                    </div>
                    <Button size="sm" variant="outline" data-testid={`button-view-${student.id}`}>
                      View Profile
                    </Button>
                  </div>

                  {student.bio && (
                    <p className="text-sm mt-2 line-clamp-2">{student.bio}</p>
                  )}

                  <div className="flex gap-2 mt-3 flex-wrap">
                    <Badge variant="secondary" className="text-xs">
                      Engagement: {student.engagementScore || 0}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      Problem Solver: {student.problemSolverScore || 0}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {student.endorsementScore || 0} Endorsements
                    </Badge>
                  </div>
                </div>
              </div>
            </Card>
          ))}

          {filteredStudents.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              No students found matching your search
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
