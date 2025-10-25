import { Navbar } from "../Navbar";
import { ThemeProvider } from "../ThemeProvider";

export default function NavbarExample() {
  return (
    <ThemeProvider>
      <div className="min-h-screen">
        <Navbar />
        <div className="pt-20 p-4">
          <p className="text-muted-foreground">Content below navbar</p>
        </div>
      </div>
    </ThemeProvider>
  );
}
