import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { UserAvatar } from "@/components/UserAvatar";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import type { UserBadge, Badge as BadgeType, Endorsement, Skill, User, Certification } from "@shared/schema";
import { BadgeIcon } from "@/components/BadgeIcon";
import { AchievementTimeline } from "@/components/AchievementTimeline";
import { CertificateShowcase } from "@/components/CertificateShowcase";
import { RankTierBadge } from "@/components/RankTierBadge";
import { Award, TrendingUp, Zap, Trophy, Clock, Shield } from "lucide-react";
import { useLocation } from "wouter";

export default function Profile() {
  const { userData: currentUser } = useAuth();
  const [location] = useLocation();
  
  // Get userId from query params if viewing another user's profile
  const params = new URLSearchParams(location.split('?')[1] || '');
  const viewingUserId = params.get('userId');
  const isViewingOwnProfile = !viewingUserId || viewingUserId === currentUser?.id;
  
  // Determine which user ID to use for queries
  const targetUserId = viewingUserId || currentUser?.id;
  
  // Fetch viewed user data if viewing someone else's profile
  const { data: viewedUser, isLoading: userLoading } = useQuery<User>({
    queryKey: [`/api/users/${viewingUserId}`],
    enabled: !!viewingUserId && !isViewingOwnProfile,
  });
  
  // Use currentUser if viewing own profile, otherwise use viewedUser
  const user = isViewingOwnProfile ? currentUser : viewedUser;

  const { data: userBadges = [] } = useQuery<(UserBadge & { badge: BadgeType })[]>({
    queryKey: [`/api/user-badges/${targetUserId}`],
    enabled: !!targetUserId,
  });

  const { data: endorsements = [] } = useQuery<(Endorsement & { endorser: User, skill?: Skill })[]>({
    queryKey: [`/api/endorsements/${targetUserId}`],
    enabled: !!targetUserId,
  });

  const { data: certifications = [] } = useQuery<Certification[]>({
    queryKey: [`/api/certifications/user/${targetUserId}`],
    enabled: !!targetUserId,
  });

  if (userLoading || !user) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-5xl">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading profile...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl">
      {/* Profile Header */}
      <Card className="p-8 mb-6 bg-gradient-to-r from-purple-600 to-pink-600 text-white">
        <div className="flex items-start gap-6">
          <UserAvatar user={user} size="xl" className="border-4 border-white" />
          <div className="flex-1">
            <h1 className="font-heading text-3xl font-bold mb-2">
              {user.firstName} {user.lastName}
            </h1>
            {user.major && (
              <p className="text-purple-100 text-lg mb-1">{user.major}</p>
            )}
            {user.university && (
              <p className="text-purple-100 mb-3">{user.university}</p>
            )}
            {user.bio && (
              <p className="text-white/90 mt-4">{user.bio}</p>
            )}
            
            {/* Rank Tier Badge */}
            <div className="mt-4">
              <RankTierBadge 
                rankTier={user.rankTier as 'bronze' | 'silver' | 'gold' | 'platinum'} 
                totalPoints={user.totalPoints || 0}
                size="lg"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-white/20 backdrop-blur rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-5 w-5" />
              <span className="text-sm">Engagement</span>
            </div>
            <div className="text-2xl font-bold">{user.engagementScore || 0}</div>
          </div>

          <div className="bg-white/20 backdrop-blur rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <Trophy className="h-5 w-5" />
              <span className="text-sm">Problem Solver</span>
            </div>
            <div className="text-2xl font-bold">{user.problemSolverScore || 0}</div>
          </div>

          <div className="bg-white/20 backdrop-blur rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <Award className="h-5 w-5" />
              <span className="text-sm">Endorsements</span>
            </div>
            <div className="text-2xl font-bold">{user.endorsementScore || 0}</div>
          </div>

          <div className="bg-white/20 backdrop-blur rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="h-5 w-5" />
              <span className="text-sm">Streak</span>
            </div>
            <div className="text-2xl font-bold">{user.streak || 0} days</div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Badges */}
        <Card className="p-6">
          <h2 className="font-heading text-xl font-semibold mb-4 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-600" />
            Achievements ({userBadges.length})
          </h2>
          {userBadges.length > 0 ? (
            <div className="grid grid-cols-3 gap-4">
              {userBadges.map((ub) => (
                <div key={ub.id} className="flex flex-col items-center gap-2">
                  <BadgeIcon badge={ub.badge} size="lg" />
                  <div className="text-xs text-center font-medium">{ub.badge.name}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Trophy className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No badges earned yet</p>
              <p className="text-sm">Keep engaging to unlock achievements!</p>
            </div>
          )}
        </Card>

        {/* Endorsements */}
        <Card className="p-6">
          <h2 className="font-heading text-xl font-semibold mb-4 flex items-center gap-2">
            <Award className="h-5 w-5 text-purple-600" />
            Endorsements ({endorsements.length})
          </h2>
          {endorsements.length > 0 ? (
            <div className="space-y-3">
              {endorsements.slice(0, 5).map((endorsement) => (
                <div key={endorsement.id} className="border-l-2 border-primary pl-3 py-2">
                  <div className="flex items-center gap-2 mb-1">
                    <UserAvatar user={endorsement.endorser} size="sm" />
                    <div>
                      <div className="font-medium text-sm">
                        {endorsement.endorser.firstName} {endorsement.endorser.lastName}
                      </div>
                      {endorsement.skill && (
                        <Badge variant="secondary" className="text-xs mt-1">
                          {endorsement.skill.name}
                        </Badge>
                      )}
                    </div>
                  </div>
                  {endorsement.comment && (
                    <p className="text-sm text-muted-foreground mt-2">
                      "{endorsement.comment}"
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Award className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No endorsements yet</p>
              <p className="text-sm">Keep up the great work!</p>
            </div>
          )}
        </Card>
      </div>

      {/* Achievement Timeline */}
      <Card className="p-6 mt-6">
        <h2 className="font-heading text-xl font-semibold mb-6 flex items-center gap-2">
          <Clock className="h-5 w-5 text-blue-600" />
          Achievement Timeline
        </h2>
        <AchievementTimeline 
          userBadges={userBadges}
          endorsements={endorsements}
          engagementScore={user.engagementScore || 0}
        />
      </Card>

      {/* Digital Certificates (NFT-Style) */}
      <div className="mt-6">
        <h2 className="font-heading text-2xl font-semibold mb-4 flex items-center gap-2">
          <Shield className="h-6 w-6 text-purple-600" />
          Digital Certificates ({certifications.length})
        </h2>
        <CertificateShowcase certifications={certifications} />
      </div>
    </div>
  );
}
