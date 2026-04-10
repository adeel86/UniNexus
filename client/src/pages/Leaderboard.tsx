import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import { UserAvatar } from "@/components/UserAvatar";
import { RankTierBadge } from "@/components/RankTierBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Trophy,
  Medal,
  Zap,
  TrendingUp,
  Swords,
  BrainCircuit,
  Star,
  Users,
  Loader2,
  Building2,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Category = "total" | "engagement" | "problem-solving" | "challenges";
type RoleFilter = "all" | "student" | "teacher" | "industry_professional" | "master_admin";
type TimeFilter = "all-time" | "monthly" | "weekly" | "daily";

interface LeaderboardEntry {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string | null;
  profileImageUrl: string | null;
  role: string;
  university: string | null;
  universityId: string | null;
  totalPoints: number;
  engagementScore: number;
  problemSolverScore: number;
  challengePoints: number;
  endorsementScore: number;
  streak: number;
  rankTier: string;
  rank: number;
}

interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  isUniversityScoped: boolean;
}

const ROLE_LABELS: Record<string, string> = {
  student: "Student",
  teacher: "Teacher",
  industry_professional: "Industry",
  university_admin: "University",
  university: "University",
  master_admin: "Admin",
};

const ROLE_COLORS: Record<string, string> = {
  student: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  teacher: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  industry_professional: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  university_admin: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  university: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  master_admin: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

function getCategoryScore(entry: LeaderboardEntry, category: Category): number {
  switch (category) {
    case "engagement": return entry.engagementScore;
    case "problem-solving": return entry.problemSolverScore;
    case "challenges": return entry.challengePoints;
    default: return entry.totalPoints;
  }
}

function getCategoryLabel(category: Category): string {
  switch (category) {
    case "engagement": return "Engagement pts";
    case "problem-solving": return "Problem-solving pts";
    case "challenges": return "Challenge pts";
    default: return "Total pts";
  }
}

function RankMedal({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-yellow-300 to-yellow-500 shadow-lg shadow-yellow-200 dark:shadow-yellow-900/30 flex-shrink-0">
        <Trophy className="h-5 w-5 text-white" />
      </div>
    );
  }
  if (rank === 2) {
    return (
      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-slate-300 to-slate-400 shadow-md flex-shrink-0">
        <Medal className="h-5 w-5 text-white" />
      </div>
    );
  }
  if (rank === 3) {
    return (
      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 shadow-md flex-shrink-0">
        <Medal className="h-5 w-5 text-white" />
      </div>
    );
  }
  return (
    <div className="flex items-center justify-center w-10 h-10 flex-shrink-0">
      <span className="text-sm font-bold text-muted-foreground">#{rank}</span>
    </div>
  );
}

function PodiumCard({
  entry,
  place,
  category,
  isCurrentUser,
}: {
  entry: LeaderboardEntry;
  place: 1 | 2 | 3;
  category: Category;
  isCurrentUser: boolean;
}) {
  const score = getCategoryScore(entry, category);
  const podiumConfig = {
    1: {
      height: "h-28",
      gradient: "from-yellow-400/20 to-yellow-500/5",
      border: "border-yellow-400/40",
      label: "1st",
      labelColor: "text-yellow-500",
      order: "order-2",
    },
    2: {
      height: "h-20",
      gradient: "from-slate-300/20 to-slate-400/5",
      border: "border-slate-300/40",
      label: "2nd",
      labelColor: "text-slate-400",
      order: "order-1",
    },
    3: {
      height: "h-16",
      gradient: "from-amber-600/20 to-amber-700/5",
      border: "border-amber-600/30",
      label: "3rd",
      labelColor: "text-amber-600",
      order: "order-3",
    },
  }[place];

  return (
    <div className={cn("flex flex-col items-center gap-2", podiumConfig.order)}>
      <div className={cn(
        "relative flex flex-col items-center gap-2 rounded-2xl border p-4 bg-gradient-to-b transition-all",
        podiumConfig.gradient,
        podiumConfig.border,
        isCurrentUser && "ring-2 ring-primary ring-offset-2",
      )}>
        {place === 1 && (
          <Trophy className="absolute -top-4 h-8 w-8 text-yellow-500 drop-shadow-md" />
        )}
        <div className={cn("mt-2", place !== 1 && "mt-0")}>
          <UserAvatar user={entry} size="lg" />
        </div>
        <div className="text-center min-w-0">
          <p className="font-semibold text-sm truncate max-w-[100px]">
            {entry.firstName} {entry.lastName}
          </p>
          <p className={cn("text-xs font-bold mt-0.5", podiumConfig.labelColor)}>
            {podiumConfig.label}
          </p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold">{score.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">pts</p>
        </div>
        {entry.streak > 0 && (
          <Badge variant="secondary" className="gap-1 text-xs px-2 py-0.5">
            <Zap className="h-3 w-3" />
            {entry.streak}d
          </Badge>
        )}
      </div>
      <div className={cn("w-full rounded-t-lg", podiumConfig.height, `bg-gradient-to-t ${podiumConfig.gradient} border border-b-0`, podiumConfig.border)} />
    </div>
  );
}

function LeaderboardCard({
  entry,
  category,
  isCurrentUser,
}: {
  entry: LeaderboardEntry;
  category: Category;
  isCurrentUser: boolean;
}) {
  const score = getCategoryScore(entry, category);
  const roleLabel = ROLE_LABELS[entry.role] ?? entry.role;
  const roleColor = ROLE_COLORS[entry.role] ?? "bg-muted text-muted-foreground";

  return (
    <Card
      className={cn(
        "transition-all hover:shadow-md",
        isCurrentUser && "ring-2 ring-primary border-primary/50 bg-primary/5",
      )}
      data-testid={`leaderboard-card-${entry.id}`}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <RankMedal rank={entry.rank} />

          <UserAvatar user={entry} size="md" />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm truncate">
                {entry.firstName} {entry.lastName}
                {isCurrentUser && (
                  <span className="ml-1 text-xs text-primary font-normal">(You)</span>
                )}
              </span>
              <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0", roleColor)}>
                {roleLabel}
              </span>
            </div>
            {entry.university && (
              <div className="flex items-center gap-1 mt-0.5">
                <Building2 className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                <span className="text-xs text-muted-foreground truncate">{entry.university}</span>
              </div>
            )}
            <div className="mt-1.5">
              <RankTierBadge
                rankTier={entry.rankTier as any}
                totalPoints={entry.totalPoints}
                size="sm"
              />
            </div>
          </div>

          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
            <div className="text-right">
              <p className="text-xl font-bold leading-none">{score.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{getCategoryLabel(category)}</p>
            </div>
            {entry.streak > 0 && (
              <Badge variant="secondary" className="gap-1 text-xs">
                <Zap className="h-3 w-3 text-amber-500" />
                {entry.streak}d streak
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Leaderboard() {
  const { userData: currentUser } = useAuth();

  const isUniversityRole =
    currentUser?.role === "university_admin" || currentUser?.role === "university";

  const [category, setCategory] = useState<Category>("total");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all-time");

  const PAGE_SIZE = 50;

  const queryParams = useMemo(() => {
    const params: Record<string, string> = {
      category,
      limit: String(PAGE_SIZE),
      offset: "0",
    };
    if (!isUniversityRole && roleFilter !== "all") {
      params.role = roleFilter;
    }
    return params;
  }, [category, roleFilter, isUniversityRole]);

  const { data, isLoading, isFetching } = useQuery<LeaderboardResponse>({
    queryKey: ["/api/leaderboard", queryParams],
    select: (data) => data,
  });

  const entries = data?.entries ?? [];
  const isUniversityScoped = data?.isUniversityScoped ?? isUniversityRole;

  const topThree = entries.slice(0, 3);
  const rest = entries.slice(3);

  const subtitle = isUniversityScoped
    ? `Internal rankings for ${currentUser?.university ?? "your university"}`
    : timeFilter === "all-time"
    ? "Global rankings across the UniNexus community"
    : `Rankings · ${timeFilter.charAt(0).toUpperCase() + timeFilter.slice(1)} view`;

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-400 to-amber-500 shadow-lg shadow-yellow-200 dark:shadow-yellow-900/30 mb-4">
          <Trophy className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold mb-1">
          {isUniversityScoped ? "University Leaderboard" : "Leaderboard"}
        </h1>
        <p className="text-muted-foreground text-sm">{subtitle}</p>
      </div>

      {/* Filters — hidden for university role */}
      {!isUniversityScoped && (
        <div className="mb-6 space-y-3">
          {/* Category Tabs */}
          <Tabs
            value={category}
            onValueChange={(v) => setCategory(v as Category)}
            className="w-full"
          >
            <TabsList className="w-full grid grid-cols-4">
              <TabsTrigger value="total" className="gap-1.5 text-xs sm:text-sm" data-testid="tab-total">
                <Star className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Total</span>
                <span className="sm:hidden">All</span>
              </TabsTrigger>
              <TabsTrigger value="engagement" className="gap-1.5 text-xs sm:text-sm" data-testid="tab-engagement">
                <TrendingUp className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Engagement</span>
                <span className="sm:hidden">Engage</span>
              </TabsTrigger>
              <TabsTrigger value="problem-solving" className="gap-1.5 text-xs sm:text-sm" data-testid="tab-problem-solving">
                <BrainCircuit className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Problem Solving</span>
                <span className="sm:hidden">Problems</span>
              </TabsTrigger>
              <TabsTrigger value="challenges" className="gap-1.5 text-xs sm:text-sm" data-testid="tab-challenges">
                <Swords className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Challenges</span>
                <span className="sm:hidden">Challenges</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Role + Time selectors */}
          <div className="flex gap-2 flex-wrap">
            <Select
              value={roleFilter}
              onValueChange={(v) => setRoleFilter(v as RoleFilter)}
            >
              <SelectTrigger className="w-auto min-w-[140px]" data-testid="select-role-filter">
                <Users className="h-4 w-4 mr-1.5 text-muted-foreground" />
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="student">Students</SelectItem>
                <SelectItem value="teacher">Teachers</SelectItem>
                <SelectItem value="industry_professional">Industry</SelectItem>
                <SelectItem value="master_admin">Admin</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={timeFilter}
              onValueChange={(v) => setTimeFilter(v as TimeFilter)}
            >
              <SelectTrigger className="w-auto min-w-[140px]" data-testid="select-time-filter">
                <Clock className="h-4 w-4 mr-1.5 text-muted-foreground" />
                <SelectValue placeholder="All Time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-time">All Time</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Category tabs for university role (no role/time filter) */}
      {isUniversityScoped && (
        <div className="mb-6">
          <Tabs
            value={category}
            onValueChange={(v) => setCategory(v as Category)}
            className="w-full"
          >
            <TabsList className="w-full grid grid-cols-4">
              <TabsTrigger value="total" className="gap-1.5 text-xs sm:text-sm" data-testid="tab-total">
                <Star className="h-3.5 w-3.5" />
                Total
              </TabsTrigger>
              <TabsTrigger value="engagement" className="gap-1.5 text-xs sm:text-sm" data-testid="tab-engagement">
                <TrendingUp className="h-3.5 w-3.5" />
                Engagement
              </TabsTrigger>
              <TabsTrigger value="problem-solving" className="gap-1.5 text-xs sm:text-sm" data-testid="tab-problem-solving">
                <BrainCircuit className="h-3.5 w-3.5" />
                Problem Solving
              </TabsTrigger>
              <TabsTrigger value="challenges" className="gap-1.5 text-xs sm:text-sm" data-testid="tab-challenges">
                <Swords className="h-3.5 w-3.5" />
                Challenges
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading rankings...</p>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && entries.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
          <Trophy className="h-12 w-12 text-muted-foreground/40" />
          <p className="font-medium text-muted-foreground">No rankings yet</p>
          <p className="text-sm text-muted-foreground/70">
            {isUniversityScoped
              ? "No users from your university are ranked yet."
              : "No users match the current filters."}
          </p>
        </div>
      )}

      {/* Podium — top 3 */}
      {!isLoading && topThree.length >= 3 && (
        <div className="flex items-end justify-center gap-4 mb-8 px-4">
          <PodiumCard
            entry={topThree[1]}
            place={2}
            category={category}
            isCurrentUser={topThree[1].id === currentUser?.id}
          />
          <PodiumCard
            entry={topThree[0]}
            place={1}
            category={category}
            isCurrentUser={topThree[0].id === currentUser?.id}
          />
          <PodiumCard
            entry={topThree[2]}
            place={3}
            category={category}
            isCurrentUser={topThree[2].id === currentUser?.id}
          />
        </div>
      )}

      {/* Top 1-2 if less than 3 entries */}
      {!isLoading && topThree.length > 0 && topThree.length < 3 && (
        <div className="space-y-2 mb-4">
          {topThree.map((entry) => (
            <LeaderboardCard
              key={entry.id}
              entry={entry}
              category={category}
              isCurrentUser={entry.id === currentUser?.id}
            />
          ))}
        </div>
      )}

      {/* Ranked list (rank 4+) */}
      {!isLoading && rest.length > 0 && (
        <div className="space-y-2" data-testid="leaderboard-list">
          {rest.map((entry) => (
            <LeaderboardCard
              key={entry.id}
              entry={entry}
              category={category}
              isCurrentUser={entry.id === currentUser?.id}
            />
          ))}
        </div>
      )}

      {/* Fetching more indicator */}
      {isFetching && !isLoading && (
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Score info note for non-all-time filters */}
      {!isLoading && entries.length > 0 && timeFilter !== "all-time" && (
        <p className="text-center text-xs text-muted-foreground mt-6">
          * Time-based filtering uses cumulative scores. Live time-windowed tracking coming soon.
        </p>
      )}
    </div>
  );
}
