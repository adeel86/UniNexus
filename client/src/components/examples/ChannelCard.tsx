import { ChannelCard } from "../ChannelCard";
import { ThemeProvider } from "../ThemeProvider";

export default function ChannelCardExample() {
  return (
    <ThemeProvider>
      <div className="p-4 max-w-sm">
        <ChannelCard
          name="Data Structures & Algorithms"
          university="University of Cambridge"
          course="Computer Science"
          members={342}
          posts={1250}
          trending={true}
        />
      </div>
    </ThemeProvider>
  );
}
