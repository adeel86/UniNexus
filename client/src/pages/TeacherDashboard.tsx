import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { User, Endorsement, Skill } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/UserAvatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { TrendingUp, Award, Users, Target } from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function TeacherDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [endorseModalOpen, setEndorseModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<User | null>(null);
  const [selectedSkill, setSelectedSkill] = useState("");
  const [endorsementComment, setEndorsementComment] = useState("");

  const { data: students = [] } = useQuery<User[]>({
    queryKey: ["/api/students"],
  });

  const { data: skills = [] } = useQuery<Skill[]>({
    queryKey: ["/api/skills"],
  });

  const endorseMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/endorsements", {
        endorsedUserId: selectedStudent?.id,
        skillId: selectedSkill || null,
        comment: endorsementComment,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/students"] });
      toast({ title: "Endorsement sent successfully!" });
      setEndorseModalOpen(false);
      setEndorsementComment("");
      setSelectedSkill("");
    },
  });

  const filteredStudents = students.filter((student) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      student.firstName?.toLowerCase().includes(searchLower) ||
      student.lastName?.toLowerCase().includes(searchLower) ||
      student.major?.toLowerCase().includes(searchLower)
    );
  });

  const topStudents = [...students]
    .sort((a, b) => (b.engagementScore || 0) - (a.engagementScore || 0))
    .slice(0, 5);

  // Calculate engagement distribution
  const engagementRanges = {
    excellent: students.filter(s => (s.engagementScore || 0) >= 1000).length,
    good: students.filter(s => (s.engagementScore || 0) >= 500 && (s.engagementScore || 0) < 1000).length,
    average: students.filter(s => (s.engagementScore || 0) >= 100 && (s.engagementScore || 0) < 500).length,
    needsHelp: students.filter(s => (s.engagementScore || 0) < 100).length,
  };

  const handleEndorseClick = (student: User) => {
    setSelectedStudent(student);
    setEndorseModalOpen(true);
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="font-heading text-3xl font-bold mb-2">Teacher Dashboard</h1>
        <p className="text-muted-foreground">
          Monitor student progress and provide endorsements
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Students</p>
              <p className="text-3xl font-bold">{students.length}</p>
            </div>
            <Users className="h-8 w-8 text-primary" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Avg Engagement</p>
              <p className="text-3xl font-bold">
                {Math.round(students.reduce((sum, s) => sum + (s.engagementScore || 0), 0) / students.length) || 0}
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-600" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Active Courses</p>
              <p className="text-3xl font-bold">3</p>
            </div>
            <Target className="h-8 w-8 text-blue-600" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Endorsements Given</p>
              <p className="text-3xl font-bold">24</p>
            </div>
            <Award className="h-8 w-8 text-purple-600" />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Students List */}
        <div className="lg:col-span-2">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading text-xl font-semibold">Students</h2>
              <Input
                placeholder="Search students..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-xs"
                data-testid="input-search-students"
              />
            </div>

            <div className="space-y-3">
              {filteredStudents.map((student) => (
                <Card
                  key={student.id}
                  className="p-4 hover-elevate"
                  data-testid={`student-${student.id}`}
                >
                  <div className="flex items-center gap-4">
                    <UserAvatar user={student} size="md" />
                    <div className="flex-1">
                      <div className="font-semibold">
                        {student.firstName} {student.lastName}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {student.major || "No major specified"}
                        {student.university && ` · ${student.university}`}
                      </div>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          Engagement: {student.engagementScore || 0}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          Streak: {student.streak || 0}
                        </Badge>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleEndorseClick(student)}
                      data-testid={`button-endorse-${student.id}`}
                    >
                      <Award className="mr-2 h-4 w-4" />
                      Endorse
                    </Button>
                  </div>
                </Card>
              ))}

              {filteredStudents.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No students found
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Top Performers and Analytics */}
        <div className="space-y-6">
          {/* Engagement Distribution */}
          <Card className="p-6">
            <h3 className="font-heading font-semibold text-lg mb-4">
              Engagement Distribution
            </h3>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Excellent (1000+)</span>
                  <span className="font-semibold">{engagementRanges.excellent}</span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-green-500 to-green-600" 
                    style={{ width: `${(engagementRanges.excellent / students.length) * 100}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Good (500-999)</span>
                  <span className="font-semibold">{engagementRanges.good}</span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-blue-600" 
                    style={{ width: `${(engagementRanges.good / students.length) * 100}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Average (100-499)</span>
                  <span className="font-semibold">{engagementRanges.average}</span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-yellow-500 to-yellow-600" 
                    style={{ width: `${(engagementRanges.average / students.length) * 100}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Needs Help (&lt;100)</span>
                  <span className="font-semibold">{engagementRanges.needsHelp}</span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-red-500 to-red-600" 
                    style={{ width: `${(engagementRanges.needsHelp / students.length) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-heading font-semibold text-lg mb-4">
              Top Performers
            </h3>
            <div className="space-y-3">
              {topStudents.map((student, index) => (
                <div key={student.id} className="flex items-center gap-3">
                  <div
                    className={`
                      h-8 w-8 rounded-full flex items-center justify-center font-bold
                      ${index === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-white' : ''}
                      ${index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-500 text-white' : ''}
                      ${index === 2 ? 'bg-gradient-to-br from-amber-700 to-amber-900 text-white' : ''}
                      ${index > 2 ? 'bg-muted' : ''}
                    `}
                  >
                    {index + 1}
                  </div>
                  <UserAvatar user={student} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {student.firstName} {student.lastName}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {student.engagementScore || 0} points
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Endorsement Modal */}
      <Dialog open={endorseModalOpen} onOpenChange={setEndorseModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl">
              Endorse {selectedStudent?.firstName} {selectedStudent?.lastName}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="skill">Skill (Optional)</Label>
              <Select value={selectedSkill} onValueChange={setSelectedSkill}>
                <SelectTrigger id="skill" data-testid="select-skill">
                  <SelectValue placeholder="Select a skill" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">General Endorsement</SelectItem>
                  {skills.map((skill) => (
                    <SelectItem key={skill.id} value={skill.id}>
                      {skill.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="comment">Comment</Label>
              <Textarea
                id="comment"
                placeholder="Share why you're endorsing this student..."
                value={endorsementComment}
                onChange={(e) => setEndorsementComment(e.target.value)}
                className="min-h-[100px]"
                data-testid="textarea-endorsement-comment"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setEndorseModalOpen(false)}
                data-testid="button-cancel-endorsement"
              >
                Cancel
              </Button>
              <Button
                onClick={() => endorseMutation.mutate()}
                disabled={!endorsementComment.trim() || endorseMutation.isPending}
                data-testid="button-submit-endorsement"
              >
                {endorseMutation.isPending ? "Sending..." : "Send Endorsement"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
