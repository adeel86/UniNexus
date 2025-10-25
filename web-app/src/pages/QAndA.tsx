import { QuestionCard } from "@/components/QuestionCard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuestions } from "@/hooks/useQuestions";
import { useState } from "react";

export default function QAndA() {
  const [filter, setFilter] = useState<string>("");
  const { data: questions, isLoading } = useQuestions(filter);

  return (
    <div className="max-w-5xl mx-auto px-4 pt-20 pb-24 md:pb-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-display font-bold mb-2">Q&A Community</h1>
          <p className="text-muted-foreground">Get help from peers and share your knowledge</p>
        </div>
        <Button className="rounded-full gap-2" data-testid="button-ask-question">
          <Plus className="h-4 w-4" />
          Ask Question
        </Button>
      </div>

      <Tabs value={filter} onValueChange={setFilter} className="mb-6">
        <TabsList className="rounded-full">
          <TabsTrigger value="" className="rounded-full" data-testid="tab-recent">Recent</TabsTrigger>
          <TabsTrigger value="trending" className="rounded-full" data-testid="tab-trending">Trending</TabsTrigger>
          <TabsTrigger value="unanswered" className="rounded-full" data-testid="tab-unanswered">Unanswered</TabsTrigger>
          <TabsTrigger value="solved" className="rounded-full" data-testid="tab-solved">Solved</TabsTrigger>
        </TabsList>
        
        <TabsContent value={filter} className="space-y-4 mt-6">
          {isLoading ? (
            <Card className="rounded-2xl p-12 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </Card>
          ) : questions && questions.length > 0 ? (
            questions.map((question) => (
              <QuestionCard key={question.id} question={question} />
            ))
          ) : (
            <Card className="rounded-2xl p-8 text-center text-muted-foreground">
              No questions found.
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
