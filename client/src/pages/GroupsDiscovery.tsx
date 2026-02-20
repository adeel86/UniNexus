import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Users, BookOpen, Code, Dumbbell, Sparkles, Plus } from "lucide-react";
import {
  useGroupsDiscovery,
  CreateGroupModal,
  EditGroupModal,
  DeleteGroupDialog,
  GroupCard,
} from "@/components/groups";

const groupTypes = [
  { value: "all", label: "All Groups", icon: Sparkles },
  { value: "subject", label: "Subject", icon: BookOpen },
  { value: "skill", label: "Skill", icon: Code },
  { value: "hobby", label: "Hobby", icon: Dumbbell },
  { value: "study_group", label: "Study Group", icon: Users },
];

export default function GroupsDiscovery() {
  const [, navigate] = useLocation();
  const {
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
  } = useGroupsDiscovery();

  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl">
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <h1 className="font-heading text-3xl font-bold mb-2 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Discover Groups
          </h1>
          <p className="text-muted-foreground">
            Find and join communities that match your interests
          </p>
        </div>

        <Button
          onClick={() => setCreateDialogOpen(true)}
          data-testid="button-create-group"
          disabled={!user}
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Group
        </Button>
      </div>

      <CreateGroupModal
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSubmit={handleCreateGroup}
        isPending={createGroupMutation.isPending}
      />

      <EditGroupModal
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        group={selectedGroup}
        onSubmit={handleEditGroup}
        isPending={updateGroupMutation.isPending}
      />

      <DeleteGroupDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        group={selectedGroup}
        onConfirm={handleDeleteGroup}
        isPending={deleteGroupMutation.isPending}
      />

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search groups..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
          data-testid="input-search-groups"
        />
      </div>

      <Tabs value={selectedType} onValueChange={setSelectedType} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          {groupTypes.map((type) => (
            <TabsTrigger
              key={type.value}
              value={type.value}
              className="gap-2"
              data-testid={`tab-${type.value}`}
            >
              <type.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{type.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={selectedType} className="mt-6">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="h-48 bg-muted animate-pulse rounded-md"
                />
              ))}
            </div>
          ) : groups.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium text-lg mb-2">No groups found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery
                  ? "Try adjusting your search terms"
                  : "Be the first to create a group!"}
              </p>
              <Button
                onClick={() => setCreateDialogOpen(true)}
                disabled={!user}
                data-testid="button-create-first-group"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Group
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groups.map((group) => {
                const isMember = myGroupIds.has(group.id);
                const isCreator = user?.id === group.creatorId;

                return (
                  <GroupCard
                    key={group.id}
                    group={group}
                    isMember={isMember}
                    isCreator={isCreator}
                    isJoining={joinMutation.isPending && joinMutation.variables === group.id}
                    isLeaving={leaveMutation.isPending && leaveMutation.variables === group.id}
                    onJoin={() => joinMutation.mutate(group.id)}
                    onLeave={() => leaveMutation.mutate(group.id)}
                    onEdit={() => openEditDialog(group)}
                    onDelete={() => openDeleteDialog(group)}
                    onClick={() => navigate(`/groups/${group.id}`)}
                  />
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
