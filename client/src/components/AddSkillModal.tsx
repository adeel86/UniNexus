import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Skill } from "@shared/schema";
import { Lightbulb, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface AddSkillModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  existingSkillIds: string[];
}

export function AddSkillModal({ open, onOpenChange, userId, existingSkillIds }: AddSkillModalProps) {
  const { toast } = useToast();
  const [selectedSkillId, setSelectedSkillId] = useState("");
  const [level, setLevel] = useState("beginner");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: allSkills = [] } = useQuery<Skill[]>({
    queryKey: ["/api/skills"],
    enabled: open,
  });

  // Filter out already added skills and apply search
  const availableSkills = allSkills.filter(
    (skill) => !existingSkillIds.includes(skill.id) && 
    skill.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const mutation = useMutation({
    mutationFn: async (data: { skillId: string; level: string }) => {
      return apiRequest("POST", "/api/users/skills", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/user-skills/${userId}`] });
      toast({ title: "Skill added successfully" });
      onOpenChange(false);
      setSelectedSkillId("");
      setLevel("beginner");
      setSearchQuery("");
    },
    onError: (error: any) => {
      toast({
        title: "Failed to add skill",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedSkillId) {
      toast({ title: "Please select a skill", variant: "destructive" });
      return;
    }

    mutation.mutate({ skillId: selectedSkillId, level });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Skill</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="search-skill">Search Skills</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="search-skill"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type to search..."
                className="pl-10"
                data-testid="input-search-skill"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="skill">Skill *</Label>
            <Select value={selectedSkillId} onValueChange={setSelectedSkillId}>
              <SelectTrigger data-testid="select-skill">
                <SelectValue placeholder="Select a skill" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {availableSkills.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    {searchQuery ? "No skills found matching your search" : "All available skills have been added"}
                  </div>
                ) : (
                  availableSkills.map((skill) => (
                    <SelectItem key={skill.id} value={skill.id}>
                      <div className="flex items-center gap-2">
                        <Lightbulb className="h-3 w-3" />
                        {skill.name}
                        {skill.category && (
                          <span className="text-xs text-muted-foreground">({skill.category})</span>
                        )}
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="level">Proficiency Level *</Label>
            <Select value={level} onValueChange={setLevel}>
              <SelectTrigger data-testid="select-level">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="beginner">Beginner</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="advanced">Advanced</SelectItem>
                <SelectItem value="expert">Expert</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              You can change this later
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              data-testid="button-cancel-skill"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={mutation.isPending || !selectedSkillId}
              data-testid="button-save-skill"
            >
              {mutation.isPending ? "Adding..." : "Add Skill"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
