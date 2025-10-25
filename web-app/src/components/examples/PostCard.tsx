import { PostCard } from "../PostCard";
import { ThemeProvider } from "../ThemeProvider";

export default function PostCardExample() {
  return (
    <ThemeProvider>
      <div className="p-4 max-w-2xl">
        <PostCard
          author={{
            name: "Sarah Johnson",
            username: "sarah_j",
            university: "University of Oxford",
            course: "Computer Science"
          }}
          content="Just finished my ML project on sentiment analysis! The dataset was challenging but the results are really promising. Anyone else working on NLP projects? 🚀"
          tags={["MachineLearning", "NLP", "ComputerScience"]}
          likes={42}
          comments={8}
          timestamp="2h ago"
        />
      </div>
    </ThemeProvider>
  );
}
