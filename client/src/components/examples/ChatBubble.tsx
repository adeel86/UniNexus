import { ChatBubble } from "../ChatBubble";
import { ThemeProvider } from "../ThemeProvider";

export default function ChatBubbleExample() {
  return (
    <ThemeProvider>
      <div className="p-4 max-w-2xl space-y-4">
        <ChatBubble role="user" content="Can you explain the difference between JOIN and UNION in SQL?" />
        <ChatBubble role="assistant" content="Great question! JOIN and UNION are both used to combine data, but they work differently. JOIN combines columns from multiple tables based on a related column, while UNION combines rows from multiple queries. Let me explain with examples..." />
      </div>
    </ThemeProvider>
  );
}
