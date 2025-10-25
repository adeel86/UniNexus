import { QuestionCard } from "../QuestionCard";
import { ThemeProvider } from "../ThemeProvider";

export default function QuestionCardExample() {
  return (
    <ThemeProvider>
      <div className="p-4 max-w-2xl">
        <QuestionCard
          author={{
            name: "Emma Wilson"
          }}
          title="How to optimize SQL queries with multiple JOIN operations?"
          content="I'm working on a project with a complex database schema and need to join 5+ tables. The query is taking too long to execute. What are the best practices for optimization?"
          tags={["SQL", "Database", "Performance"]}
          upvotes={23}
          answers={5}
          solved={true}
          timestamp="4h ago"
        />
      </div>
    </ThemeProvider>
  );
}
