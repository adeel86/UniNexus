import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import type { Group, GroupMember } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/useDebounce";
import { insertGroupSchema } from "@shared/schema";
import { z } from "zod";

export const createGroupFormSchema = insertGroupSchema.omit({ creatorId: true });
export type CreateGroupFormData = z.infer<typeof createGroupFormSchema>;

export type GroupWithMembership = Group & {
  isMember?: boolean;
};

export function useGroupsDiscovery() {
  const { userData: user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);

  const debouncedSearch = useDebounce(searchQuery, 500);

  const getQueryKey = () => ["/api/groups", { 
    type: selectedType && selectedType !== "all" ? selectedType : undefined,
    search: debouncedSearch.trim() || undefined 
  }];

  const { data: groups = [], isLoading } = useQuery<Group[]>({
    queryKey: getQueryKey(),
  });

  const { data: myMemberships = [] } = useQuery<Array<{ membership: GroupMember; group: Group }>>({
    queryKey: ["/api/users/groups"],
    enabled: !!user,
  });

  const myGroupIds = new Set(myMemberships.map(m => m.membership.groupId));

  const joinMutation = useMutation({
    mutationFn: async (groupId: string) => {
      return apiRequest("POST", `/api/groups/${groupId}/join`);
    },
    onMutate: async (groupId) => {
      await queryClient.cancelQueries({ queryKey: ["/api/groups"] });
      await queryClient.cancelQueries({ queryKey: ["/api/users/groups"] });

      const previousGroups = queryClient.getQueryData<Group[]>(getQueryKey());
      const previousMyGroups = queryClient.getQueryData(["/api/users/groups"]);

      queryClient.setQueryData<Group[]>(
        getQueryKey(),
        (old = []) => old.map((g) => 
          g.id === groupId ? { ...g, memberCount: (g.memberCount || 0) + 1 } : g
        )
      );

      return { previousGroups, previousMyGroups };
    },
    onError: (error, _, context) => {
      if (context?.previousGroups) {
        queryClient.setQueryData(getQueryKey(), context.previousGroups);
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
      navigate(`/groups/${groupId}`);
    },
  });

  const leaveMutation = useMutation({
    mutationFn: async (groupId: string) => {
      return apiRequest("DELETE", `/api/groups/${groupId}/leave`);
    },
    onMutate: async (groupId) => {
      await queryClient.cancelQueries({ queryKey: ["/api/groups"] });
      await queryClient.cancelQueries({ queryKey: ["/api/users/groups"] });

      const previousGroups = queryClient.getQueryData<Group[]>(getQueryKey());
      const previousMyGroups = queryClient.getQueryData(["/api/users/groups"]);

      queryClient.setQueryData<Group[]>(
        getQueryKey(),
        (old = []) => old.map((g) => 
          g.id === groupId ? { ...g, memberCount: Math.max(0, (g.memberCount || 0) - 1) } : g
        )
      );

      return { previousGroups, previousMyGroups };
    },
    onError: (error, _, context) => {
      if (context?.previousGroups) {
        queryClient.setQueryData(getQueryKey(), context.previousGroups);
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

  const createGroupMutation = useMutation({
    mutationFn: async (data: CreateGroupFormData) => {
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
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create group",
        variant: "destructive",
      });
    },
  });

  const updateGroupMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: CreateGroupFormData }) => {
      return apiRequest("PATCH", `/api/groups/${id}`, data);
    },
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ["/api/groups"] });
      const previousGroups = queryClient.getQueryData<Group[]>(getQueryKey());
      queryClient.setQueryData<Group[]>(
        getQueryKey(),
        (old = []) => old.map((g) => (g.id === id ? { ...g, ...data } : g))
      );
      return { previousGroups };
    },
    onError: (error: any, _, context) => {
      if (context?.previousGroups) {
        queryClient.setQueryData(getQueryKey(), context.previousGroups);
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

  const deleteGroupMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/groups/${id}`);
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["/api/groups"] });
      const previousGroups = queryClient.getQueryData<Group[]>(getQueryKey());
      queryClient.setQueryData<Group[]>(
        getQueryKey(),
        (old = []) => old.filter((g) => g.id !== id)
      );
      return { previousGroups };
    },
    onError: (error: any, _, context) => {
      if (context?.previousGroups) {
        queryClient.setQueryData(getQueryKey(), context.previousGroups);
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

  const handleCreateGroup = (data: CreateGroupFormData) => {
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
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (group: Group) => {
    setSelectedGroup(group);
    setDeleteDialogOpen(true);
  };

  return {
    user,
    groups,
    isLoading,
    myGroupIds,
    searchQuery,
    setSearchQuery,
    selectedType,
    setSelectedType,
    createDialogOpen,
    setCreateDialogOpen,
    editDialogOpen,
    setEditDialogOpen,
    deleteDialogOpen,
    setDeleteDialogOpen,
    selectedGroup,
    setSelectedGroup,
    joinMutation,
    leaveMutation,
    createGroupMutation,
    updateGroupMutation,
    deleteGroupMutation,
    handleCreateGroup,
    handleEditGroup,
    handleDeleteGroup,
    openEditDialog,
    openDeleteDialog,
  };
}
