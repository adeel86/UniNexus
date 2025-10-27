import { EventCard } from "../EventCard";
import { ThemeProvider } from "../ThemeProvider";

export default function EventCardExample() {
  return (
    <ThemeProvider>
      <div className="p-4 max-w-sm">
        <EventCard
          title="Algorithm Study Group"
          host={{ name: "Marcus Lee" }}
          date="Tomorrow, Dec 15"
          time="2:00 PM - 4:00 PM"
          location="Library, Room 203"
          attendees={12}
          description="Join us for a collaborative study session on dynamic programming algorithms. Bring your questions!"
        />
      </div>
    </ThemeProvider>
  );
}
