import { Calendar, Clock, MapPin, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQuery } from "@tanstack/react-query";
import type { Event, User } from "@shared/schema";

interface EventCardProps {
  event: Event;
}

export function EventCard({ event }: EventCardProps) {
  const { data: host } = useQuery<User>({
    queryKey: [`/api/auth/user/${event.userId}`],
    enabled: !!event.userId,
  });

  if (!host) return null;

  return (
    <Card className="rounded-xl p-4 hover-elevate" data-testid={`card-event-${event.id}`}>
      <div className="flex items-start gap-3 mb-3">
        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-chart-2 flex items-center justify-center flex-shrink-0">
          <Calendar className="h-6 w-6 text-white" />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-semibold mb-1" data-testid="text-event-title">{event.title}</h3>
          <div className="flex items-center gap-2">
            <Avatar className="h-5 w-5">
              <AvatarImage src={host.photoURL || ""} />
              <AvatarFallback className="text-xs">
                {host.displayName?.split(' ').map(n => n[0]).join('') || 'U'}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground">Hosted by {host.displayName}</span>
          </div>
        </div>
      </div>
      
      {event.description && (
        <p className="text-sm text-muted-foreground mb-3 leading-relaxed" data-testid="text-event-description">
          {event.description}
        </p>
      )}
      
      <div className="space-y-2 mb-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          <span data-testid="text-event-date">{event.date}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          <span data-testid="text-event-time">{event.time}</span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          <span data-testid="text-event-location">{event.location}</span>
        </div>
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          <span data-testid="text-event-attendees">{event.attendeesCount} attending</span>
        </div>
      </div>
      
      <Button className="w-full rounded-full" data-testid="button-join-event">
        Join Event
      </Button>
    </Card>
  );
}
