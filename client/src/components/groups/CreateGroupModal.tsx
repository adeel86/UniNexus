import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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

interface CreateGroupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateGroupFormData) => void;
  isPending: boolean;
}

export function CreateGroupModal({
  open,
  onOpenChange,
  onSubmit,
  isPending,
}: CreateGroupModalProps) {
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

  const handleSubmit = (data: CreateGroupFormData) => {
    onSubmit(data);
    form.reset();
  };

  const handleCancel = () => {
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create a New Group</DialogTitle>
          <DialogDescription>
            Build a community around your interests and connect with like-minded people
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4">
            <GroupFormFields form={form} testIdPrefix="group" />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                data-testid="button-cancel-create"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                data-testid="button-submit-create"
              >
                {isPending ? "Creating..." : "Create Group"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
