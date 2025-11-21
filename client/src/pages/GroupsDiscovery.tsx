import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { Group, GroupMember } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Search, Users, BookOpen, Code, Dumbbell, Sparkles, Plus, Check, Lock, Globe, MoreVertical, Edit, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/useDebounce";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertGroupSchema } from "@shared/schema";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

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

// Create a form schema that omits creatorId (backend will set it from session)
const createGroupFormSchema = insertGroupSchema.omit({ creatorId: true });
type CreateGroupFormData = z.infer<typeof createGroupFormSchema>;

export default function GroupsDiscovery() {
  const { userData: user } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  
  // Debounce search query to avoid excessive API calls
  const debouncedSearch = useDebounce(searchQuery, 500);

  // Create group form
  const form = useForm<CreateGroupFormData>({
    resolver: zodResolver(createGroupFormSchema),
    defaultValues: {
      name: "",
      description: "",
      groupType: "skill",
      category: "",
      university: "",
      coverImageUrl: "",
      isPrivate: false,
    },
  });

  // Edit group form
  const editForm = useForm<CreateGroupFormData>({
    resolver: zodResolver(createGroupFormSchema),
    defaultValues: {
      name: "",
      description: "",
      groupType: "skill",
      category: "",
      university: "",
      coverImageUrl: "",
      isPrivate: false,
    },
  });

  // Fetch groups
  const { data: groups = [], isLoading } = useQuery<Group[]>({
    queryKey: ["/api/groups", { 
      type: selectedType && selectedType !== "all" ? selectedType : undefined,
      search: debouncedSearch.trim() || undefined 
    }],
  });

  // Check user's memberships
  const { data: myMemberships = [] } = useQuery<Array<{ membership: GroupMember; group: Group }>>({
    queryKey: ["/api/users/groups"],
    enabled: !!user,
  });

  const myGroupIds = new Set(myMemberships.map(m => m.membership.groupId));

  // Join group mutation with optimistic update
  const joinMutation = useMutation({
    mutationFn: async (groupId: string) => {
      return apiRequest("POST", `/api/groups/${groupId}/join`);
    },
    onMutate: async (groupId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["/api/groups"] });
      await queryClient.cancelQueries({ queryKey: ["/api/users/groups"] });

      // Snapshot previous values
      const groupsQueryKey = ["/api/groups", { 
        type: selectedType && selectedType !== "all" ? selectedType : undefined,
        search: debouncedSearch.trim() || undefined 
      }];
      const previousGroups = queryClient.getQueryData<Group[]>(groupsQueryKey);
      const previousMyGroups = queryClient.getQueryData(["/api/users/groups"]);

      // Optimistically update member count
      queryClient.setQueryData<Group[]>(
        groupsQueryKey,
        (old = []) => old.map((g) => 
          g.id === groupId ? { ...g, memberCount: (g.memberCount || 0) + 1 } : g
        )
      );

      return { previousGroups, previousMyGroups };
    },
    onError: (error, _, context) => {
      // Rollback on error
      if (context?.previousGroups) {
        const groupsQueryKey = ["/api/groups", { 
          type: selectedType && selectedType !== "all" ? selectedType : undefined,
          search: debouncedSearch.trim() || undefined 
        }];
        queryClient.setQueryData(
          groupsQueryKey,
          context.previousGroups
        );
      }
      if (context?.previousMyGroups) {
        queryClient.setQueryData(["/api/users/groups"], context.previousMyGroups);
      }
      toast({
        title: "Error",
        description: "Failed to join group",
        variant: "destructive",
      });
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
  });

  // Leave group mutation with optimistic update
  const leaveMutation = useMutation({
    mutationFn: async (groupId: string) => {
      return apiRequest("DELETE", `/api/groups/${groupId}/leave`);
    },
    onMutate: async (groupId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["/api/groups"] });
      await queryClient.cancelQueries({ queryKey: ["/api/users/groups"] });

      // Snapshot previous values
      const groupsQueryKey = ["/api/groups", { 
        type: selectedType && selectedType !== "all" ? selectedType : undefined,
        search: debouncedSearch.trim() || undefined 
      }];
      const previousGroups = queryClient.getQueryData<Group[]>(groupsQueryKey);
      const previousMyGroups = queryClient.getQueryData(["/api/users/groups"]);

      // Optimistically update member count
      queryClient.setQueryData<Group[]>(
        groupsQueryKey,
        (old = []) => old.map((g) => 
          g.id === groupId ? { ...g, memberCount: Math.max(0, (g.memberCount || 0) - 1) } : g
        )
      );

      return { previousGroups, previousMyGroups };
    },
    onError: (error, _, context) => {
      // Rollback on error
      if (context?.previousGroups) {
        const groupsQueryKey = ["/api/groups", { 
          type: selectedType && selectedType !== "all" ? selectedType : undefined,
          search: debouncedSearch.trim() || undefined 
        }];
        queryClient.setQueryData(
          groupsQueryKey,
          context.previousGroups
        );
      }
      if (context?.previousMyGroups) {
        queryClient.setQueryData(["/api/users/groups"], context.previousMyGroups);
      }
      toast({
        title: "Error",
        description: "Failed to leave group",
        variant: "destructive",
      });
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
  });

  // Create group mutation
  const createGroupMutation = useMutation({
    mutationFn: async (data: CreateGroupFormData) => {
      // Backend will set creatorId from authenticated session
      return apiRequest("POST", "/api/groups", data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Group created successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/groups"] });
      setCreateDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create group",
        variant: "destructive",
      });
    },
  });

  const handleCreateGroup = (data: CreateGroupFormData) => {
    // Check authentication
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to create a group",
        variant: "destructive",
      });
      return;
    }

    createGroupMutation.mutate(data);
  };

  // Update group mutation with optimistic update
  const updateGroupMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: CreateGroupFormData }) => {
      return apiRequest("PATCH", `/api/groups/${id}`, data);
    },
    onMutate: async ({ id, data }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["/api/groups"] });

      // Snapshot previous value
      const previousGroups = queryClient.getQueryData<Group[]>(["/api/groups", selectedType, debouncedSearch]);

      // Optimistically update
      queryClient.setQueryData<Group[]>(
        ["/api/groups", selectedType, debouncedSearch],
        (old = []) => old.map((g) => (g.id === id ? { ...g, ...data } : g))
      );

      return { previousGroups };
    },
    onError: (error: any, _, context) => {
      // Rollback on error
      if (context?.previousGroups) {
        const groupsQueryKey = ["/api/groups", { 
          type: selectedType && selectedType !== "all" ? selectedType : undefined,
          search: debouncedSearch.trim() || undefined 
        }];
        queryClient.setQueryData(
          groupsQueryKey,
          context.previousGroups
        );
      }
      toast({
        title: "Error",
        description: error.message || "Failed to update group",
        variant: "destructive",
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Group updated successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      setEditDialogOpen(false);
      setSelectedGroup(null);
    },
  });

  // Delete group mutation with optimistic update
  const deleteGroupMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/groups/${id}`);
    },
    onMutate: async (id) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["/api/groups"] });

      // Snapshot previous value
      const previousGroups = queryClient.getQueryData<Group[]>(["/api/groups", selectedType, debouncedSearch]);

      // Optimistically remove from cache
      queryClient.setQueryData<Group[]>(
        ["/api/groups", selectedType, debouncedSearch],
        (old = []) => old.filter((g) => g.id !== id)
      );

      return { previousGroups };
    },
    onError: (error: any, _, context) => {
      // Rollback on error
      if (context?.previousGroups) {
        const groupsQueryKey = ["/api/groups", { 
          type: selectedType && selectedType !== "all" ? selectedType : undefined,
          search: debouncedSearch.trim() || undefined 
        }];
        queryClient.setQueryData(
          groupsQueryKey,
          context.previousGroups
        );
      }
      toast({
        title: "Error",
        description: error.message || "Failed to delete group",
        variant: "destructive",
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Group deleted successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/groups"] });
      setDeleteDialogOpen(false);
      setSelectedGroup(null);
    },
  });

  const handleEditGroup = (data: CreateGroupFormData) => {
    if (!selectedGroup) return;
    updateGroupMutation.mutate({ id: selectedGroup.id, data });
  };

  const handleDeleteGroup = () => {
    if (!selectedGroup) return;
    deleteGroupMutation.mutate(selectedGroup.id);
  };

  const openEditDialog = (group: Group) => {
    setSelectedGroup(group);
    editForm.reset({
      name: group.name,
      description: group.description || "",
      groupType: group.groupType as any,
      category: group.category || "",
      university: group.university || "",
      coverImageUrl: group.coverImageUrl || "",
      isPrivate: group.isPrivate,
    });
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (group: Group) => {
    setSelectedGroup(group);
    setDeleteDialogOpen(true);
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <h1 className="font-heading text-3xl font-bold mb-2 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Discover Groups
          </h1>
          <p className="text-muted-foreground">
            Find and join communities that match your interests
          </p>
        </div>
        
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-group" disabled={!user}>
              <Plus className="h-4 w-4 mr-2" />
              Create Group
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create a New Group</DialogTitle>
              <DialogDescription>
                Build a community around your interests and connect with like-minded people
              </DialogDescription>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleCreateGroup)} className="space-y-4 py-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Group Name <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., React Developers Community"
                          data-testid="input-group-name"
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
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe what your group is about..."
                          rows={4}
                          data-testid="textarea-group-description"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="groupType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Type <span className="text-destructive">*</span>
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-group-type">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="skill">Skill</SelectItem>
                            <SelectItem value="subject">Subject</SelectItem>
                            <SelectItem value="hobby">Hobby</SelectItem>
                            <SelectItem value="study_group">Study Group</SelectItem>
                            <SelectItem value="university">University</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., Tech, Business, Arts"
                            data-testid="input-group-category"
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="university"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>University (optional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Tech University"
                          data-testid="input-group-university"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="coverImageUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cover Image URL (optional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://example.com/image.jpg"
                          data-testid="input-group-cover"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isPrivate"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between rounded-md border p-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {field.value ? (
                              <Lock className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <Globe className="h-4 w-4 text-muted-foreground" />
                            )}
                            <FormLabel className="cursor-pointer">
                              {field.value ? "Private Group" : "Public Group"}
                            </FormLabel>
                          </div>
                          <FormDescription>
                            {field.value
                              ? "Only members can see posts and content"
                              : "Anyone can discover and join this group"}
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-group-privacy"
                          />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      form.reset();
                      setCreateDialogOpen(false);
                    }}
                    data-testid="button-cancel-create"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createGroupMutation.isPending}
                    data-testid="button-submit-create"
                  >
                    {createGroupMutation.isPending ? "Creating..." : "Create Group"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Edit Group Dialog */}
        <Dialog 
          open={editDialogOpen} 
          onOpenChange={(open) => {
            setEditDialogOpen(open);
            if (!open) {
              setSelectedGroup(null);
              editForm.reset();
            }
          }}
        >
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Group</DialogTitle>
              <DialogDescription>
                Update your group information and settings
              </DialogDescription>
            </DialogHeader>
            
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(handleEditGroup)} className="space-y-4 py-4">
                <FormField
                  control={editForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Group Name <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., React Developers Community"
                          data-testid="input-edit-group-name"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe what your group is about..."
                          rows={4}
                          data-testid="textarea-edit-group-description"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="groupType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Type <span className="text-destructive">*</span>
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-edit-group-type">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="skill">Skill</SelectItem>
                            <SelectItem value="subject">Subject</SelectItem>
                            <SelectItem value="hobby">Hobby</SelectItem>
                            <SelectItem value="study_group">Study Group</SelectItem>
                            <SelectItem value="university">University</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={editForm.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., Tech, Business, Arts"
                            data-testid="input-edit-group-category"
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={editForm.control}
                  name="university"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>University (optional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Tech University"
                          data-testid="input-edit-group-university"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="coverImageUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cover Image URL (optional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://example.com/image.jpg"
                          data-testid="input-edit-group-cover"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="isPrivate"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between rounded-md border p-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {field.value ? (
                              <Lock className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <Globe className="h-4 w-4 text-muted-foreground" />
                            )}
                            <FormLabel className="cursor-pointer">
                              {field.value ? "Private Group" : "Public Group"}
                            </FormLabel>
                          </div>
                          <FormDescription>
                            {field.value
                              ? "Only members can see posts and content"
                              : "Anyone can discover and join this group"}
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-edit-group-privacy"
                          />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      editForm.reset();
                      setEditDialogOpen(false);
                    }}
                    data-testid="button-cancel-edit"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={updateGroupMutation.isPending}
                    data-testid="button-submit-edit"
                  >
                    {updateGroupMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog 
          open={deleteDialogOpen} 
          onOpenChange={(open) => {
            setDeleteDialogOpen(open);
            if (!open) {
              setSelectedGroup(null);
            }
          }}
        >
          <AlertDialogContent data-testid="dialog-delete-group">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Group</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{selectedGroup?.name}"? This action cannot be undone.
                All group posts, members, and related data will be permanently removed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteGroup}
                disabled={deleteGroupMutation.isPending}
                className="bg-destructive hover:bg-destructive/90"
                data-testid="button-confirm-delete"
              >
                {deleteGroupMutation.isPending ? "Deleting..." : "Delete Group"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
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
            // Track mutations per specific group to prevent double-clicks
            const isJoining = joinMutation.isPending && joinMutation.variables === group.id;
            const isLeaving = leaveMutation.isPending && leaveMutation.variables === group.id;

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
                  
                  {/* Action menu for creator/admin */}
                  {user && group.creatorId === user.id && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          data-testid={`button-group-menu-${group.id}`}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => openEditDialog(group)}
                          data-testid={`menu-edit-${group.id}`}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Group
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => openDeleteDialog(group)}
                          className="text-destructive focus:text-destructive"
                          data-testid={`menu-delete-${group.id}`}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Group
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
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
