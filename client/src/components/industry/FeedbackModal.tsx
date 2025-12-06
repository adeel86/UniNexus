import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Star } from "lucide-react";
import { UseFormReturn } from "react-hook-form";
import type { User } from "@shared/schema";
import type { FeedbackFormData } from "./useIndustryDashboard";

interface FeedbackModalProps {
  open: boolean;
  onClose: () => void;
  student: User | null;
  form: UseFormReturn<FeedbackFormData>;
  onSubmit: (data: FeedbackFormData) => void;
  isPending: boolean;
}

export function FeedbackModal({
  open,
  onClose,
  student,
  form,
  onSubmit,
  isPending,
}: FeedbackModalProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Give Feedback to {student?.firstName} {student?.lastName}
          </DialogTitle>
          <DialogDescription>
            Provide constructive feedback to help this student grow professionally
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-feedback-category">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="technical_skills">Technical Skills</SelectItem>
                      <SelectItem value="soft_skills">Soft Skills</SelectItem>
                      <SelectItem value="problem_solving">Problem Solving</SelectItem>
                      <SelectItem value="communication">Communication</SelectItem>
                      <SelectItem value="leadership">Leadership</SelectItem>
                      <SelectItem value="teamwork">Teamwork</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="rating"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rating *</FormLabel>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => field.onChange(star)}
                        className="focus:outline-none"
                        data-testid={`star-${star}`}
                      >
                        <Star
                          className={`h-8 w-8 transition-colors ${
                            star <= field.value
                              ? "fill-yellow-500 text-yellow-500"
                              : "text-muted-foreground hover:text-yellow-400"
                          }`}
                        />
                      </button>
                    ))}
                    <span className="ml-2 text-lg font-medium">{field.value}/5</span>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="context"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Context</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-feedback-context">
                        <SelectValue placeholder="Select context" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="general">General Observation</SelectItem>
                      <SelectItem value="challenge">Challenge Participation</SelectItem>
                      <SelectItem value="interview">Interview</SelectItem>
                      <SelectItem value="project_review">Project Review</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="feedback"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Feedback *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Share your observations and suggestions for improvement..."
                      className="min-h-[120px]"
                      data-testid="textarea-feedback"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                data-testid="button-cancel-feedback"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending || !form.formState.isValid}
                data-testid="button-submit-feedback"
              >
                {isPending ? "Submitting..." : "Submit Feedback"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
