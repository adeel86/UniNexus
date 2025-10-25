import { FloatingActionButton } from "../FloatingActionButton";
import { ThemeProvider } from "../ThemeProvider";

export default function FloatingActionButtonExample() {
  return (
    <ThemeProvider>
      <div className="h-screen bg-background relative">
        <p className="p-4 text-muted-foreground">Scroll down to see the FAB</p>
        <FloatingActionButton />
      </div>
    </ThemeProvider>
  );
}
