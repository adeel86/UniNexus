import { ChannelCard } from "@/components/ChannelCard";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Search, Loader2 } from "lucide-react";
import { useChannels } from "@/hooks/useChannels";
import { useState } from "react";

export default function Channels() {
  const { data: channels, isLoading } = useChannels();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredChannels = channels?.filter(channel =>
    channel.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    channel.university.toLowerCase().includes(searchQuery.toLowerCase()) ||
    channel.course.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <div className="max-w-7xl mx-auto px-4 pt-20 pb-24 md:pb-8">
      <div className="mb-8">
        <h1 className="text-4xl font-display font-bold mb-2">Course Channels</h1>
        <p className="text-muted-foreground">Join channels to connect with peers in your courses</p>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search channels..."
          className="pl-10 rounded-full"
          data-testid="input-search-channels"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {isLoading ? (
        <Card className="rounded-2xl p-12 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </Card>
      ) : filteredChannels.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredChannels.map((channel) => (
            <ChannelCard
              key={channel.id}
              name={channel.name}
              university={channel.university}
              course={channel.course}
              members={channel.membersCount}
              posts={channel.postsCount}
              trending={channel.trending}
            />
          ))}
        </div>
      ) : (
        <Card className="rounded-2xl p-8 text-center text-muted-foreground">
          No channels found. Try a different search term.
        </Card>
      )}
    </div>
  );
}
