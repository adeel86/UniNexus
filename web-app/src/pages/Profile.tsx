import { ProfileCard } from "@/components/ProfileCard";
import { PostCard } from "@/components/PostCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import type { User, Post } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";

export default function Profile() {
  const { user: firebaseUser } = useAuth();

  // Fetch current user's profile data
  const { data: user, isLoading: userLoading } = useQuery<User>({
    queryKey: [`/api/auth/user/${firebaseUser?.uid}`],
    enabled: !!firebaseUser?.uid,
  });

  // Fetch user's posts
  const { data: posts = [], isLoading: postsLoading } = useQuery<Post[]>({
    queryKey: [`/api/posts/user/${user?.id}`],
    enabled: !!user?.id,
  });

  if (userLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 pt-20 pb-24 md:pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <Skeleton className="h-[400px] rounded-2xl" />
          </div>
          <div className="lg:col-span-2">
            <Skeleton className="h-[600px] rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-6xl mx-auto px-4 pt-20 pb-24 md:pb-8">
        <div className="text-center py-12">
          <p className="text-muted-foreground">User not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 pt-20 pb-24 md:pb-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <ProfileCard
            name={user.displayName || "User"}
            username={user.email?.split('@')[0] || "user"}
            avatar={user.photoURL || undefined}
            bio={user.bio || "No bio yet"}
            university={user.university || ""}
            course={user.course || ""}
            score={user.uniNexusScore || 0}
            skills={user.skills || []}
          />
        </div>

        <div className="lg:col-span-2">
          <Tabs defaultValue="posts" className="w-full">
            <TabsList className="rounded-full">
              <TabsTrigger value="posts" className="rounded-full" data-testid="tab-posts">Posts</TabsTrigger>
              <TabsTrigger value="answers" className="rounded-full" data-testid="tab-answers">Answers</TabsTrigger>
              <TabsTrigger value="projects" className="rounded-full" data-testid="tab-projects">Projects</TabsTrigger>
            </TabsList>
            
            <TabsContent value="posts" className="space-y-4 mt-6">
              {postsLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-48 rounded-2xl" />
                  <Skeleton className="h-48 rounded-2xl" />
                </div>
              ) : posts.length > 0 ? (
                posts.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))
              ) : (
                <p className="text-center text-muted-foreground py-8">No posts yet</p>
              )}
            </TabsContent>
            
            <TabsContent value="answers" className="mt-6">
              <p className="text-center text-muted-foreground py-8">No answers yet</p>
            </TabsContent>
            
            <TabsContent value="projects" className="mt-6">
              <p className="text-center text-muted-foreground py-8">No projects added yet</p>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
