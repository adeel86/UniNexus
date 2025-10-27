import { PostComposer } from "../PostComposer";
import { ThemeProvider } from "../ThemeProvider";

export default function PostComposerExample() {
  return (
    <ThemeProvider>
      <div className="p-4 max-w-2xl">
        <PostComposer />
      </div>
    </ThemeProvider>
  );
}
