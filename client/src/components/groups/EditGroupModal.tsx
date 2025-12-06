import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Group } from "@shared/schema";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { createGroupFormSchema, CreateGroupFormData } from "./useGroupsDiscovery";
import { GroupFormFields } from "./GroupFormFields";

interface EditGroupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: Group | null;
  onSubmit: (data: CreateGroupFormData) => void;
  isPending: boolean;
}

export function EditGroupModal({
  open,
  onOpenChange,
  group,
  onSubmit,
  isPending,
}: EditGroupModalProps) {
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

  useEffect(() => {
    if (group) {
      form.reset({
        name: group.name,
        description: group.description || "",
        groupType: group.groupType as any,
        category: group.category || "",
        university: group.university || "",
        coverImageUrl: group.coverImageUrl || "",
        isPrivate: group.isPrivate,
      });
    }
  }, [group, form]);

  const handleSubmit = (data: CreateGroupFormData) => {
    onSubmit(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Group</DialogTitle>
          <DialogDescription>
            Update your group&apos;s information
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4">
            <GroupFormFields form={form} testIdPrefix="edit-group" />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel-edit"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                data-testid="button-submit-edit"
              >
                {isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
