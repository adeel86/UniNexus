import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, Plus, X, Award } from "lucide-react";
import type { UserSkill, Skill } from "@shared/schema";
import { useState } from "react";
import { AddSkillModal } from "./AddSkillModal";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface UserSkillWithCount extends UserSkill {
  skill: Skill;
  endorsementCount?: number;
}

interface SkillsSectionProps {
  userSkills: UserSkillWithCount[];
  isOwnProfile: boolean;
  userId: string;
}

const levelColors = {
  beginner: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  intermediate: "bg-green-500/10 text-green-700 dark:text-green-400",
  advanced: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
  expert: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
};

const levelLabels = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
  expert: "Expert",
};

export function SkillsSection({ userSkills, isOwnProfile, userId }: SkillsSectionProps) {
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [endorseModalOpen, setEndorseModalOpen] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState<UserSkillWithCount | null>(null);
  const [endorsementComment, setEndorsementComment] = useState("");
  const { toast } = useToast();

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/users/skills/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/user-skills/${userId}`] });
      toast({ title: "Skill removed" });
    },
    onError: () => {
      toast({ title: "Failed to remove skill", variant: "destructive" });
    },
  });

  const updateLevelMutation = useMutation({
    mutationFn: async ({ id, level }: { id: string; level: string }) => {
      return apiRequest("PATCH", `/api/users/skills/${id}`, { level });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/user-skills/${userId}`] });
      toast({ title: "Skill level updated" });
    },
    onError: () => {
      toast({ title: "Failed to update skill level", variant: "destructive" });
    },
  });

  const endorseMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/endorsements", {
        endorsedUserId: userId,
        skillId: selectedSkill?.skillId,
        comment: endorsementComment,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/user-skills/${userId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/endorsements/${userId}`] });
      toast({ title: "Skill endorsed successfully!" });
      setEndorseModalOpen(false);
      setEndorsementComment("");
      setSelectedSkill(null);
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to endorse skill", 
        description: error.message || "Please try again",
        variant: "destructive" 
      });
    },
  });

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to remove this skill?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleLevelChange = (id: string, level: string) => {
    updateLevelMutation.mutate({ id, level });
  };

  const handleEndorseClick = (userSkill: UserSkillWithCount) => {
    setSelectedSkill(userSkill);
    setEndorseModalOpen(true);
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-primary" />
          <h3 className="font-heading text-lg font-semibold">Skills</h3>
        </div>
        {isOwnProfile && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setAddModalOpen(true)}
            data-testid="button-add-skill"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Skill
          </Button>
        )}
      </div>

      {userSkills.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Lightbulb className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">No skills added yet</p>
          {isOwnProfile && (
            <p className="text-xs mt-1">Showcase your skills to highlight your expertise</p>
          )}
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {userSkills.map((userSkill) => (
            <div
              key={userSkill.id}
              className="group relative inline-flex items-center gap-2"
              data-testid={`skill-${userSkill.id}`}
            >
              {isOwnProfile ? (
                <div className="flex items-center gap-1 px-3 py-1.5 rounded-full border bg-card hover-elevate">
                  <Lightbulb className="h-3 w-3 text-primary" />
                  <span className="text-sm font-medium">{userSkill.skill.name}</span>
                  
                  <Select
                    value={userSkill.level}
                    onValueChange={(value) => handleLevelChange(userSkill.id, value)}
                  >
                    <SelectTrigger 
                      className="h-6 text-xs px-2 py-0 border-0 bg-transparent hover-elevate min-w-[100px]"
                      data-testid={`select-skill-level-${userSkill.id}`}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                      <SelectItem value="expert">Expert</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-5 w-5 p-0 ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleDelete(userSkill.id)}
                    data-testid={`button-remove-skill-${userSkill.id}`}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <Badge
                    variant="secondary"
                    className={`${levelColors[userSkill.level as keyof typeof levelColors] || levelColors.beginner} px-3 py-1.5 text-sm gap-1`}
                  >
                    <Lightbulb className="h-3 w-3" />
                    {userSkill.skill.name}
                    <span className="text-xs opacity-75">• {levelLabels[userSkill.level as keyof typeof levelLabels]}</span>
                    {(userSkill.endorsementCount || 0) > 0 && (
                      <span className="ml-1 bg-primary/20 text-primary px-1.5 rounded text-xs font-medium">
                        +{userSkill.endorsementCount}
                      </span>
                    )}
                  </Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 opacity-70 hover:opacity-100"
                    onClick={() => handleEndorseClick(userSkill)}
                    data-testid={`button-endorse-skill-${userSkill.id}`}
                  >
                    <Award className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <AddSkillModal
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
        userId={userId}
        existingSkillIds={userSkills.map(us => us.skillId)}
      />

      <Dialog open={endorseModalOpen} onOpenChange={setEndorseModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading text-xl flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              Endorse {selectedSkill?.skill.name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="endorsement-comment">Comment (Optional)</Label>
              <Textarea
                id="endorsement-comment"
                placeholder="Share why you're endorsing this skill..."
                value={endorsementComment}
                onChange={(e) => setEndorsementComment(e.target.value)}
                className="min-h-[100px] mt-2"
                data-testid="textarea-endorse-comment"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setEndorseModalOpen(false);
                  setEndorsementComment("");
                  setSelectedSkill(null);
                }}
                data-testid="button-cancel-endorse"
              >
                Cancel
              </Button>
              <Button
                onClick={() => endorseMutation.mutate()}
                disabled={endorseMutation.isPending}
                data-testid="button-submit-endorse"
              >
                {endorseMutation.isPending ? "Endorsing..." : "Endorse Skill"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
