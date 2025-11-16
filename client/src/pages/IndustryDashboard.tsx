import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { User, insertChallengeSchema } from "@shared/schema";
import { UserAvatar } from "@/components/UserAvatar";
import { Badge } from "@/components/ui/badge";
import { Search, Briefcase, Users, Trophy, Plus, Calendar, TrendingUp, MessageSquare } from "lucide-react";
import { UniversalFeed } from "@/components/UniversalFeed";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

// Form validation schema
const challengeFormSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  requiredSkills: z.string().min(1, "At least one skill is required"),
  prizePool: z.coerce.number().min(0, "Prize pool must be a positive number"),
  deadline: z.string().min(1, "Deadline is required").refine((val) => {
    const date = new Date(val);
    return date > new Date();
  }, "Deadline must be in the future"),
  difficultyLevel: z.enum(["beginner", "intermediate", "advanced"]),
});

type ChallengeFormData = z.infer<typeof challengeFormSchema>;

export default function IndustryDashboard() {
  const [searchTerm, setSearchTerm] = useState("");
  const [skillFilter, setSkillFilter] = useState("");
  const [isChallengeModalOpen, setIsChallengeModalOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<ChallengeFormData>({
    resolver: zodResolver(challengeFormSchema),
    mode: "onChange",
    defaultValues: {
      title: "",
      description: "",
      requiredSkills: "",
      prizePool: 0,
      deadline: "",
      difficultyLevel: "intermediate",
    },
  });

  const { data: students = [] } = useQuery<User[]>({
    queryKey: ["/api/students"],
  });

  const createChallengeMutation = useMutation({
    mutationFn: async (data: z.infer<typeof insertChallengeSchema>) => {
      return await apiRequest("POST", "/api/challenges", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/challenges"] });
      toast({
        title: "Success!",
        description: "Challenge created successfully",
      });
      setIsChallengeModalOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create challenge",
        variant: "destructive",
      });
    },
  });

  const handleCreateChallenge = (data: ChallengeFormData) => {
    createChallengeMutation.mutate({
      title: data.title,
      description: `${data.description}\n\nRequired Skills: ${data.requiredSkills}`,
      difficulty: data.difficultyLevel,
      prizes: `Prize Pool: $${data.prizePool}`,
      endDate: new Date(data.deadline),
      startDate: new Date(),
      status: "active",
      category: "industry_challenge",
    });
  };

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
          Discover talented students, create challenges, and engage with the community
        </p>
      </div>

      <Tabs defaultValue="analytics" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="analytics" data-testid="tab-analytics">
            <TrendingUp className="h-4 w-4 mr-2" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="feed" data-testid="tab-feed">
            <MessageSquare className="h-4 w-4 mr-2" />
            Community Feed
          </TabsTrigger>
        </TabsList>

        <TabsContent value="feed">
          <UniversalFeed role="industry" initialCategory="all" />
        </TabsContent>

        <TabsContent value="analytics">
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
            onClick={() => setIsChallengeModalOpen(true)}
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
        </TabsContent>
      </Tabs>

      {/* Modals */}
      {/* Challenge Creation Modal */}
      <Dialog open={isChallengeModalOpen} onOpenChange={setIsChallengeModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Industry Challenge</DialogTitle>
            <DialogDescription>
              Create a challenge for students to showcase their skills and compete for prizes
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleCreateChallenge)} className="space-y-4 py-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Challenge Title *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Build a Full-Stack E-commerce App"
                        data-testid="input-challenge-title"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description *</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Provide detailed challenge requirements, evaluation criteria, and expectations..."
                        className="min-h-[120px]"
                        data-testid="input-challenge-description"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="requiredSkills"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Required Skills (comma-separated) *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., React, Node.js, MongoDB, REST APIs"
                        data-testid="input-challenge-skills"
                        {...field}
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      Separate skills with commas
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="difficultyLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Difficulty Level *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-difficulty">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="beginner">Beginner</SelectItem>
                          <SelectItem value="intermediate">Intermediate</SelectItem>
                          <SelectItem value="advanced">Advanced</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="prizePool"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prize Pool ($) *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          placeholder="e.g., 5000"
                          data-testid="input-prize-pool"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="deadline"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Deadline *</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <Input
                          type="datetime-local"
                          className="pl-10"
                          data-testid="input-deadline"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsChallengeModalOpen(false)}
                  data-testid="button-cancel-challenge"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createChallengeMutation.isPending || !form.formState.isValid}
                  data-testid="button-submit-challenge"
                >
                  {createChallengeMutation.isPending ? "Creating..." : "Create Challenge"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
