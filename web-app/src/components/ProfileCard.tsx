import { MapPin, GraduationCap, Link as LinkIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface ProfileCardProps {
  name: string;
  username: string;
  avatar?: string;
  bio: string;
  university: string;
  course: string;
  score: number;
  skills?: string[];
}

export function ProfileCard({ name, username, avatar, bio, university, course, score, skills }: ProfileCardProps) {
  return (
    <Card className="rounded-2xl overflow-hidden hover-elevate" data-testid={`card-profile-${username}`}>
      <div className="h-24 bg-gradient-to-r from-primary via-chart-2 to-chart-3"></div>
      
      <div className="p-6 -mt-12">
        <Avatar className="h-24 w-24 ring-4 ring-background mb-4">
          <AvatarImage src={avatar} />
          <AvatarFallback className="bg-gradient-to-br from-primary to-chart-2 text-white text-2xl">
            {name.split(' ').map(n => n[0]).join('')}
          </AvatarFallback>
        </Avatar>
        
        <div className="mb-3">
          <h3 className="font-display font-semibold text-xl" data-testid="text-profile-name">{name}</h3>
          <p className="text-sm text-muted-foreground">@{username}</p>
        </div>
        
        <p className="text-sm mb-4 leading-relaxed" data-testid="text-profile-bio">{bio}</p>
        
        <div className="space-y-2 mb-4 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <GraduationCap className="h-4 w-4" />
            <span>{university}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>{course}</span>
          </div>
          <div className="flex items-center gap-2">
            <LinkIcon className="h-4 w-4 text-muted-foreground" />
            <span className="text-primary font-medium">uninexus.app/{username}</span>
          </div>
        </div>
        
        {skills && skills.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {skills.map(skill => (
              <Badge key={skill} variant="secondary" className="text-xs" data-testid={`badge-skill-${skill}`}>
                {skill}
              </Badge>
            ))}
          </div>
        )}
        
        <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-primary/10 to-chart-2/10 mb-4">
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">UniNexus Score</p>
            <p className="text-2xl font-display font-bold bg-gradient-to-r from-primary to-chart-2 bg-clip-text text-transparent" data-testid="text-uninexus-score">
              {score}
            </p>
          </div>
        </div>
        
        <Button className="w-full rounded-full" data-testid="button-view-profile">
          View Full Profile
        </Button>
      </div>
    </Card>
  );
}
