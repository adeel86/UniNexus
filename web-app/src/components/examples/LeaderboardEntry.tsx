import { LeaderboardEntry } from "../LeaderboardEntry";
import { ThemeProvider } from "../ThemeProvider";

export default function LeaderboardEntryExample() {
  return (
    <ThemeProvider>
      <div className="p-4 max-w-2xl space-y-2">
        <LeaderboardEntry
          rank={1}
          user={{
            name: "Sophie Martinez",
            username: "sophie_m",
            university: "UCL"
          }}
          score={5420}
          change={120}
        />
        <LeaderboardEntry
          rank={2}
          user={{
            name: "James Wright",
            username: "james_w",
            university: "Oxford"
          }}
          score={4980}
          change={-50}
        />
      </div>
    </ThemeProvider>
  );
}
