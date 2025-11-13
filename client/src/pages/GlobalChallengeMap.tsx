import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Trophy, Calendar, Users, Target, Globe } from "lucide-react";
import { useState } from "react";
import type { Challenge } from "@shared/schema";

interface MapData {
  challenges: Challenge[];
  universityCounts: Record<string, {
    active: number;
    upcoming: number;
    completed: number;
    total: number;
    challenges: Challenge[];
  }>;
}

export default function GlobalChallengeMap() {
  const [selectedUniversity, setSelectedUniversity] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data, isLoading } = useQuery<MapData>({
    queryKey: ["/api/challenges/map"],
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="animate-pulse space-y-6">
          <div className="h-12 bg-muted rounded w-1/3"></div>
          <div className="h-96 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <Card className="p-12 text-center">
          <Globe className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="font-semibold text-lg mb-2">No challenges yet</h3>
          <p className="text-muted-foreground">Check back soon for global challenges!</p>
        </Card>
      </div>
    );
  }

  const universities = Object.entries(data.universityCounts).sort((a, b) => b[1].total - a[1].total);
  
  const filteredChallenges = selectedUniversity
    ? data.universityCounts[selectedUniversity]?.challenges || []
    : data.challenges;

  const displayChallenges = statusFilter === "all"
    ? filteredChallenges
    : filteredChallenges.filter(c => c.status === statusFilter);

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="font-heading text-4xl font-bold mb-2 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
          Global Challenge Map
        </h1>
        <p className="text-muted-foreground">
          Explore live challenges and hackathons across universities worldwide
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <Card className="p-6">
            <h3 className="font-heading font-semibold text-lg mb-4 flex items-center gap-2">
              <MapPin className="h-5 w-5 text-purple-600" />
              Universities
            </h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              <Button
                variant={selectedUniversity === null ? "default" : "outline"}
                className={`w-full justify-start ${selectedUniversity === null ? "bg-gradient-to-r from-purple-600 to-pink-600" : ""}`}
                onClick={() => setSelectedUniversity(null)}
                data-testid="filter-all-universities"
              >
                <Globe className="h-4 w-4 mr-2" />
                All Universities ({data.challenges.length})
              </Button>
              {universities.map(([university, counts]) => (
                <Button
                  key={university}
                  variant={selectedUniversity === university ? "default" : "outline"}
                  className={`w-full justify-between text-left ${selectedUniversity === university ? "bg-gradient-to-r from-purple-600 to-pink-600" : ""}`}
                  onClick={() => setSelectedUniversity(university)}
                  data-testid={`filter-university-${university}`}
                >
                  <span className="truncate flex-1">{university}</span>
                  <Badge variant="secondary" className="ml-2">
                    {counts.total}
                  </Badge>
                </Button>
              ))}
            </div>
          </Card>

          {selectedUniversity && data.universityCounts[selectedUniversity] && (
            <Card className="p-6">
              <h3 className="font-heading font-semibold text-lg mb-4">University Stats</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-green-50 dark:bg-green-950 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {data.universityCounts[selectedUniversity].active}
                  </div>
                  <div className="text-xs text-green-700 dark:text-green-300">Active</div>
                </div>
                <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {data.universityCounts[selectedUniversity].upcoming}
                  </div>
                  <div className="text-xs text-blue-700 dark:text-blue-300">Upcoming</div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-950 rounded-lg p-3 text-center col-span-2">
                  <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">
                    {data.universityCounts[selectedUniversity].completed}
                  </div>
                  <div className="text-xs text-gray-700 dark:text-gray-300">Completed</div>
                </div>
              </div>
            </Card>
          )}
        </div>

        <div className="lg:col-span-2">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-heading font-semibold text-lg">
                {selectedUniversity ? `${selectedUniversity} Challenges` : "All Challenges"}
              </h3>
              <Tabs value={statusFilter} onValueChange={setStatusFilter}>
                <TabsList>
                  <TabsTrigger value="all" data-testid="filter-status-all">All</TabsTrigger>
                  <TabsTrigger value="active" data-testid="filter-status-active">Active</TabsTrigger>
                  <TabsTrigger value="upcoming" data-testid="filter-status-upcoming">Upcoming</TabsTrigger>
                  <TabsTrigger value="completed" data-testid="filter-status-completed">Completed</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              {displayChallenges.length === 0 ? (
                <div className="text-center py-12">
                  <Target className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-muted-foreground">No challenges found</p>
                </div>
              ) : (
                displayChallenges.map((challenge) => (
                  <Card key={challenge.id} className="p-4 hover-elevate" data-testid={`challenge-card-${challenge.id}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold truncate">{challenge.title}</h4>
                          <Badge 
                            variant={challenge.status === 'active' ? 'default' : 'secondary'}
                            className={challenge.status === 'active' ? 'bg-green-500' : ''}
                          >
                            {challenge.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                          {challenge.description}
                        </p>
                        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                          {challenge.hostUniversity && (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {challenge.hostUniversity}
                            </div>
                          )}
                          {challenge.category && (
                            <div className="flex items-center gap-1">
                              <Trophy className="h-3 w-3" />
                              {challenge.category}
                            </div>
                          )}
                          {challenge.endDate && (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(challenge.endDate).toLocaleDateString()}
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {challenge.participantCount} participants
                          </div>
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        className="flex-shrink-0"
                        data-testid={`button-view-challenge-${challenge.id}`}
                      >
                        View
                      </Button>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
