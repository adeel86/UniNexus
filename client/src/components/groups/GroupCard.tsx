import type { Group } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, BookOpen, Code, Dumbbell, Sparkles, Plus, Check, Lock, MoreVertical, Edit, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const groupTypeIcons: Record<string, typeof BookOpen> = {
  subject: BookOpen,
  skill: Code,
  hobby: Dumbbell,
  study_group: Users,
  university: Users,
};

interface GroupCardProps {
  group: Group;
  isMember: boolean;
  isCreator: boolean;
  isJoining: boolean;
  isLeaving: boolean;
  onJoin: () => void;
  onLeave: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onClick: () => void;
}

export function GroupCard({
  group,
  isMember,
  isCreator,
  isJoining,
  isLeaving,
  onJoin,
  onLeave,
  onEdit,
  onDelete,
  onClick,
}: GroupCardProps) {
  const TypeIcon = groupTypeIcons[group.groupType] || Sparkles;

  return (
    <Card
      className="p-4 hover-elevate cursor-pointer"
      onClick={onClick}
      data-testid={`card-group-${group.id}`}
    >
      {group.coverImageUrl && (
        <div
          className="h-32 -mx-4 -mt-4 mb-4 bg-cover bg-center rounded-t-md"
          style={{ backgroundImage: `url(${group.coverImageUrl})` }}
        />
      )}

      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
            <TypeIcon className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <h3 className="font-medium truncate">{group.name}</h3>
            <div className="flex items-center gap-1.5 flex-wrap">
              <Badge variant="secondary">
                {group.groupType.replace("_", " ")}
              </Badge>
              {group.isPrivate && (
                <Lock className="h-3 w-3 text-muted-foreground" />
              )}
            </div>
          </div>
        </div>

        {isCreator && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon"
                data-testid={`button-menu-${group.id}`}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                data-testid={`menu-edit-${group.id}`}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Group
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
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
            onClick={(e) => {
              e.stopPropagation();
              onLeave();
            }}
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
            onClick={(e) => {
              e.stopPropagation();
              onJoin();
            }}
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
}
