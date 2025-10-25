import { ProfileCard } from "../ProfileCard";
import { ThemeProvider } from "../ThemeProvider";

export default function ProfileCardExample() {
  return (
    <ThemeProvider>
      <div className="p-4 max-w-sm">
        <ProfileCard
          name="Alex Chen"
          username="alex_chen"
          bio="3rd year CS student passionate about AI and web development. Always looking to collaborate on interesting projects!"
          university="Imperial College London"
          course="Computer Science"
          score={2847}
          skills={["Python", "React", "Machine Learning", "TypeScript"]}
        />
      </div>
    </ThemeProvider>
  );
}
