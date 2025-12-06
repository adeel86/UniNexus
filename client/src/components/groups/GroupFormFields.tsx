import { UseFormReturn } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Lock, Globe } from "lucide-react";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { CreateGroupFormData } from "./useGroupsDiscovery";

interface GroupFormFieldsProps {
  form: UseFormReturn<CreateGroupFormData>;
  testIdPrefix: string;
}

export function GroupFormFields({ form, testIdPrefix }: GroupFormFieldsProps) {
  return (
    <>
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
                data-testid={`input-${testIdPrefix}-name`}
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
                data-testid={`textarea-${testIdPrefix}-description`}
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
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger data-testid={`select-${testIdPrefix}-type`}>
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
                  data-testid={`input-${testIdPrefix}-category`}
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
                data-testid={`input-${testIdPrefix}-university`}
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
                data-testid={`input-${testIdPrefix}-cover`}
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
                  data-testid={`switch-${testIdPrefix}-privacy`}
                />
              </FormControl>
            </div>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}
