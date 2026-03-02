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
    mutationFn: async (data: { skillId?: string; skillName?: string; level: string }) => {
      return apiRequest("POST", "/api/users/skills", data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/user-skills/${userId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/skills"] });
      
      // Update the local cache immediately with the new skill
      queryClient.setQueryData([`/api/user-skills/${userId}`], (old: any[] = []) => {
        // Avoid duplicates if already present
        if (old.some(us => us.skillId === data.skillId)) return old;
        return [...old, data];
      });

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

    if (!selectedSkillId && !searchQuery) {
      toast({ title: "Please select or enter a skill", variant: "destructive" });
      return;
    }

    if (selectedSkillId) {
      mutation.mutate({ skillId: selectedSkillId, level });
    } else if (searchQuery) {
      mutation.mutate({ skillName: searchQuery, level });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Skill</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="search-skill">Search or Add New Skill</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="search-skill"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSelectedSkillId(""); // Reset selection when searching
                }}
                placeholder="Search existing or type new skill..."
                className="pl-10"
                data-testid="input-search-skill"
              />
            </div>
          </div>

          {searchQuery && availableSkills.length > 0 && (
            <div className="border rounded-md max-h-[200px] overflow-y-auto p-1 bg-background/50 backdrop-blur-sm">
              {availableSkills.map((skill) => (
                <button
                  key={skill.id}
                  type="button"
                  onClick={() => {
                    setSelectedSkillId(skill.id);
                    setSearchQuery(skill.name);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-sm hover:bg-accent transition-colors ${
                    selectedSkillId === skill.id ? "bg-accent" : ""
                  }`}
                >
                  <Lightbulb className="h-4 w-4 text-yellow-500" />
                  <span className="flex-1 text-left">{skill.name}</span>
                  {skill.category && (
                    <span className="text-xs text-muted-foreground">({skill.category})</span>
                  )}
                </button>
              ))}
            </div>
          )}

          {searchQuery && availableSkills.length === 0 && !selectedSkillId && (
            <div className="p-3 border border-dashed rounded-md bg-accent/20 flex items-center gap-2 text-sm">
              <Lightbulb className="h-4 w-4 text-muted-foreground" />
              <span>Skill not found. Press "Add Skill" to create <strong>"{searchQuery}"</strong></span>
            </div>
          )}

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
              disabled={mutation.isPending || (!selectedSkillId && !searchQuery)}
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
