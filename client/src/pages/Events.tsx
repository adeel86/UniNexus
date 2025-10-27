import { EventCard } from "@/components/EventCard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEvents } from "@/hooks/useEvents";
import { useState } from "react";

export default function Events() {
  const [filter, setFilter] = useState<string>("");
  const { data: events, isLoading } = useEvents(filter);

  return (
    <div className="max-w-5xl mx-auto px-4 pt-20 pb-24 md:pb-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-display font-bold mb-2">Study Events</h1>
          <p className="text-muted-foreground">Join study sessions and meetups</p>
        </div>
        <Button className="rounded-full gap-2" data-testid="button-create-event">
          <Plus className="h-4 w-4" />
          Create Event
        </Button>
      </div>

      <Tabs value={filter} onValueChange={setFilter} className="mb-6">
        <TabsList className="rounded-full">
          <TabsTrigger value="" className="rounded-full" data-testid="tab-upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="my-events" className="rounded-full" data-testid="tab-my-events">My Events</TabsTrigger>
          <TabsTrigger value="past" className="rounded-full" data-testid="tab-past">Past</TabsTrigger>
        </TabsList>
        
        <TabsContent value={filter} className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          {isLoading ? (
            <Card className="rounded-2xl p-12 flex items-center justify-center col-span-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </Card>
          ) : events && events.length > 0 ? (
            events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))
          ) : (
            <Card className="rounded-2xl p-8 text-center text-muted-foreground col-span-2">
              No events found.
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
