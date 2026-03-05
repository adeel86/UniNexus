import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useState } from "react";
import {
  MessageSquare,
  ThumbsUp,
  Send,
  CheckCircle,
  ArrowLeft,
  Loader2,
  Edit2,
  Trash2,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/lib/AuthContext";

type DiscussionReply = {
  id: string;
  content: string;
  upvoteCount: number;
  createdAt: string;
  author: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
  };
};

type DiscussionDetailType = {
  id: string;
  title: string;
  content: string;
  upvoteCount: number;
  replyCount: number;
  isResolved: boolean;
  createdAt: string;
  authorId: string;
  author: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
  };
};

export default function DiscussionDetail() {
  const { courseId, discussionId } = useParams<{ courseId: string; discussionId: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { userData } = useAuth();
  const [newReplyContent, setNewReplyContent] = useState("");
  const [isEditingDiscussion, setIsEditingDiscussion] = useState(false);
  const [editingDiscussionTitle, setEditingDiscussionTitle] = useState("");
  const [editingDiscussionContent, setEditingDiscussionContent] = useState("");
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [editingReplyContent, setEditingReplyContent] = useState("");

  // Fetch discussion details
  const { data: discussion, isLoading: discussionLoading } = useQuery<DiscussionDetailType>({
    queryKey: ["/api/discussions", discussionId],
    enabled: !!discussionId,
  });

  // Fetch replies for this discussion
  const { data: replies = [], isLoading: repliesLoading } = useQuery<DiscussionReply[]>({
    queryKey: ["/api/discussions", discussionId, "replies"],
    enabled: !!discussionId,
  });

  // Create reply mutation
  const createReplyMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await apiRequest("POST", "/api/replies", {
        discussionId,
        content,
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/discussions", discussionId, "replies"] });
      queryClient.invalidateQueries({ queryKey: [`/api/courses/${courseId}/discussions`] });
      setNewReplyContent("");
      toast({
        title: "Reply posted",
        description: "Your reply has been posted successfully!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Upvote discussion mutation
  const upvoteDiscussionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/discussions/${discussionId}/upvote`, {});
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/discussions", discussionId] });
      queryClient.invalidateQueries({ queryKey: [`/api/courses/${courseId}/discussions`] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Upvote reply mutation
  const upvoteReplyMutation = useMutation({
    mutationFn: async (replyId: string) => {
      const response = await apiRequest("POST", `/api/discussions/${discussionId}/upvote`, {
        replyId,
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/discussions", discussionId, "replies"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update discussion mutation
  const updateDiscussionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("PUT", `/api/discussions/${discussionId}`, {
        title: editingDiscussionTitle,
        content: editingDiscussionContent,
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/discussions", discussionId] });
      queryClient.invalidateQueries({ queryKey: [`/api/courses/${courseId}/discussions`] });
      setIsEditingDiscussion(false);
      toast({
        title: "Discussion updated",
        description: "Your discussion has been updated successfully!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete discussion mutation
  const deleteDiscussionMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/discussions/${discussionId}`, {});
    },
    onSuccess: () => {
      // Invalidate queries to clear cache
      queryClient.invalidateQueries({ queryKey: ["/api/discussions", discussionId] });
      queryClient.invalidateQueries({ queryKey: [`/api/courses/${courseId}/discussions`] });
      queryClient.invalidateQueries({ queryKey: ["/api/courses", courseId] });
      
      toast({
        title: "Discussion deleted",
        description: "Your discussion has been deleted successfully!",
      });
      
      // Redirect after a short delay to ensure queries are invalidated
      setTimeout(() => {
        navigate(`/courses/${courseId}`);
      }, 500);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update reply mutation
  const updateReplyMutation = useMutation({
    mutationFn: async (replyId: string) => {
      const response = await apiRequest("PUT", `/api/replies/${replyId}`, {
        content: editingReplyContent,
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/discussions", discussionId, "replies"] });
      setEditingReplyId(null);
      toast({
        title: "Reply updated",
        description: "Your reply has been updated successfully!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete reply mutation
  const deleteReplyMutation = useMutation({
    mutationFn: async (replyId: string) => {
      await apiRequest("DELETE", `/api/replies/${replyId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/discussions", discussionId, "replies"] });
      queryClient.invalidateQueries({ queryKey: [`/api/courses/${courseId}/discussions`] });
      toast({
        title: "Reply deleted",
        description: "Your reply has been deleted successfully!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleStartEditDiscussion = () => {
    if (discussion) {
      setEditingDiscussionTitle(discussion.title);
      setEditingDiscussionContent(discussion.content);
      setIsEditingDiscussion(true);
    }
  };

  const handleSaveDiscussion = () => {
    if (!editingDiscussionTitle.trim() || !editingDiscussionContent.trim()) {
      toast({
        title: "Error",
        description: "Title and content are required",
        variant: "destructive",
      });
      return;
    }
    updateDiscussionMutation.mutate();
  };

  const handleCancelEditDiscussion = () => {
    setIsEditingDiscussion(false);
    setEditingDiscussionTitle("");
    setEditingDiscussionContent("");
  };

  const handleDeleteDiscussion = () => {
    if (window.confirm("Are you sure you want to delete this discussion? This action cannot be undone.")) {
      deleteDiscussionMutation.mutate();
    }
  };

  const handleStartEditReply = (replyId: string, content: string) => {
    setEditingReplyId(replyId);
    setEditingReplyContent(content);
  };

  const handleSaveReply = () => {
    if (!editingReplyContent.trim()) {
      toast({
        title: "Error",
        description: "Reply content cannot be empty",
        variant: "destructive",
      });
      return;
    }
    if (editingReplyId) {
      updateReplyMutation.mutate(editingReplyId);
    }
  };

  const handleCancelEditReply = () => {
    setEditingReplyId(null);
    setEditingReplyContent("");
  };

  const handleDeleteReply = (replyId: string) => {
    if (window.confirm("Are you sure you want to delete this reply?")) {
      deleteReplyMutation.mutate(replyId);
    }
  };

  const handlePostReply = () => {
    if (!newReplyContent.trim()) {
      toast({
        title: "Empty reply",
        description: "Please write something before posting!",
        variant: "destructive",
      });
      return;
    }
    createReplyMutation.mutate(newReplyContent);
  };

  if (discussionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading discussion...</p>
        </div>
      </div>
    );
  }

  if (!discussion) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-semibold mb-4">Discussion Not Found</p>
            <p className="text-muted-foreground mb-6">This discussion doesn't exist or has been deleted.</p>
            <Button onClick={() => navigate(`/courses/${courseId}`)}>
              Back to Course
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Back button */}
        <Button
          variant="ghost"
          className="gap-2"
          onClick={() => navigate(`/courses/${courseId}`)}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Course
        </Button>

        {/* Discussion Header */}
        <Card>
          <CardHeader>
            {isEditingDiscussion ? (
              <div className="space-y-4">
                <input
                  type="text"
                  value={editingDiscussionTitle}
                  onChange={(e) => setEditingDiscussionTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-input rounded-md text-lg font-semibold"
                  placeholder="Discussion title..."
                />
                <Textarea
                  value={editingDiscussionContent}
                  onChange={(e) => setEditingDiscussionContent(e.target.value)}
                  className="min-h-[150px] resize-none"
                  placeholder="Discussion content..."
                />
                <div className="flex gap-2">
                  <Button
                    onClick={handleSaveDiscussion}
                    disabled={updateDiscussionMutation.isPending}
                  >
                    {updateDiscussionMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                  <Button variant="ghost" onClick={handleCancelEditDiscussion}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className="text-2xl">{discussion.title}</CardTitle>
                      {discussion.isResolved && (
                        <Badge variant="default" className="gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Resolved
                        </Badge>
                      )}
                    </div>
                  </div>
                  {userData?.id === discussion.authorId && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleStartEditDiscussion}
                        className="gap-2"
                      >
                        <Edit2 className="w-4 h-4" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleDeleteDiscussion}
                        disabled={deleteDiscussionMutation.isPending}
                        className="gap-2 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </Button>
                    </div>
                  )}
                </div>
                
                {/* Author info */}
                <div className="flex items-center gap-3 mt-4 pt-4 border-t">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={discussion.author?.avatarUrl || undefined} />
                    <AvatarFallback>
                      {discussion.author?.firstName?.[0]}
                      {discussion.author?.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium">
                      {discussion.author?.firstName} {discussion.author?.lastName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {discussion.createdAt ? (
                        <>
                          {new Date(discussion.createdAt).toLocaleDateString()} at{" "}
                          {new Date(discussion.createdAt).toLocaleTimeString()}
                        </>
                      ) : (
                    "Date unavailable"
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2"
                  onClick={() => upvoteDiscussionMutation.mutate()}
                  disabled={upvoteDiscussionMutation.isPending}
                >
                  <ThumbsUp className="w-4 h-4" />
                  {discussion.upvoteCount}
                </Button>
              </div>
            </div>
              </>
            )}
          </CardHeader>

          <CardContent className="space-y-4">
            {!isEditingDiscussion && (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <p className="whitespace-pre-wrap text-foreground">{discussion.content}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Replies Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Replies ({discussion.replyCount})
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* New reply form */}
            <div className="space-y-3 pb-6 border-b">
              <label className="text-sm font-medium">Your Reply</label>
              <Textarea
                placeholder="Share your thoughts or answer..."
                value={newReplyContent}
                onChange={(e) => setNewReplyContent(e.target.value)}
                className="min-h-[100px] resize-none"
              />
              <div className="flex justify-end">
                <Button
                  onClick={handlePostReply}
                  disabled={createReplyMutation.isPending || !newReplyContent.trim()}
                  className="gap-2"
                >
                  {createReplyMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  Post Reply
                </Button>
              </div>
            </div>

            {/* Replies list */}
            {repliesLoading ? (
              <div className="text-center py-8">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                <p className="text-muted-foreground">Loading replies...</p>
              </div>
            ) : replies.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No replies yet. Be the first to respond!</p>
              </div>
            ) : (
              <ScrollArea className="h-[500px]">
                <div className="space-y-4 pr-4">
                  {replies.map((reply) => (
                    <div key={reply.id} className="border rounded-lg p-4 space-y-3">
                      {editingReplyId === reply.id ? (
                        <div className="space-y-3">
                          <Textarea
                            value={editingReplyContent}
                            onChange={(e) => setEditingReplyContent(e.target.value)}
                            className="min-h-[80px] resize-none"
                            placeholder="Edit your reply..."
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={handleSaveReply}
                              disabled={updateReplyMutation.isPending}
                            >
                              Save Changes
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={handleCancelEditReply}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {/* Reply author */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={reply.author?.avatarUrl || undefined} />
                                <AvatarFallback>
                                  {reply.author?.firstName?.[0]}
                                  {reply.author?.lastName?.[0]}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="text-sm font-medium">
                                  {reply.author?.firstName} {reply.author?.lastName}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {reply.createdAt ? new Date(reply.createdAt).toLocaleDateString() : "Date unavailable"}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="gap-1"
                                onClick={() => upvoteReplyMutation.mutate(reply.id)}
                                disabled={upvoteReplyMutation.isPending}
                              >
                                <ThumbsUp className="w-3 h-3" />
                                <span className="text-xs">{reply.upvoteCount}</span>
                              </Button>
                              {userData?.id === reply.author?.id && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleStartEditReply(reply.id, reply.content)}
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteReply(reply.id)}
                                    disabled={deleteReplyMutation.isPending}
                                    className="text-destructive hover:text-destructive"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Reply content */}
                          <p className="text-sm whitespace-pre-wrap text-foreground">{reply.content}</p>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
