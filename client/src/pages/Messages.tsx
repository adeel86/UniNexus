import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { User, Conversation, Message } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/UserAvatar";
import { Send, MessageCircle, Plus, Search } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/AuthContext";
import { formatDistanceToNow } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface EnrichedConversation extends Conversation {
  participants: User[];
  lastMessage?: Message & { sender: User };
  unreadCount: number;
}

interface MessageWithSender extends Message {
  sender: User;
}

export default function Messages() {
  const { userData: currentUser } = useAuth();
  const { toast } = useToast();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [newConversationOpen, setNewConversationOpen] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [processedUserId, setProcessedUserId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Check for userId in URL params
  const urlParams = new URLSearchParams(window.location.search);
  const targetUserId = urlParams.get('userId');

  // Get all conversations
  const { data: conversations = [], isSuccess: conversationsLoaded } = useQuery<EnrichedConversation[]>({
    queryKey: ["/api/conversations"],
    refetchInterval: 5000, // Poll every 5 seconds for new messages
  });

  // Get messages for selected conversation
  const { data: messages = [] } = useQuery<{ message: Message; sender: User }[]>({
    queryKey: ["/api/conversations", selectedConversationId, "messages"],
    enabled: !!selectedConversationId,
    refetchInterval: 3000, // Poll every 3 seconds when viewing a conversation
  });

  // Send message mutation
  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
      return await apiRequest("POST", `/api/conversations/${selectedConversationId}/messages`, {
        content,
      });
    },
    onSuccess: () => {
      setMessageInput("");
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", selectedConversationId, "messages"] });
    },
  });

  // Mark messages as read
  const markAsRead = useMutation({
    mutationFn: async (conversationId: string) => {
      return await apiRequest("PATCH", `/api/conversations/${conversationId}/read`, {});
    },
  });

  // Search users for new conversation
  const { data: userSearchResults = [] } = useQuery<User[]>({
    queryKey: ["/api/users/search", { q: userSearchTerm }],
    enabled: userSearchTerm.length >= 3,
  });

  // Create new conversation mutation
  const createConversation = useMutation({
    mutationFn: async (participantId: string) => {
      const response = await apiRequest("POST", `/api/conversations`, {
        participantIds: [participantId],
      });
      return response as unknown as Conversation;
    },
    onSuccess: (conversation: Conversation) => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      setSelectedConversationId(conversation.id);
      setNewConversationOpen(false);
      setUserSearchTerm("");
      toast({
        title: "Conversation started",
        description: "You can now start chatting!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to start conversation",
        variant: "destructive",
      });
    },
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Mark as read when viewing conversation
  useEffect(() => {
    if (selectedConversationId) {
      markAsRead.mutate(selectedConversationId);
    }
  }, [selectedConversationId]);

  // Handle URL parameter for pre-selecting user
  useEffect(() => {
    if (targetUserId && conversationsLoaded && targetUserId !== processedUserId) {
      // Mark this userId as processed to prevent duplicate actions
      setProcessedUserId(targetUserId);
      
      // Check if conversation already exists with this user
      const existingConversation = conversations.find(conv => 
        conv.participants.some(p => p.id === targetUserId)
      );
      
      if (existingConversation) {
        // Select the existing conversation
        setSelectedConversationId(existingConversation.id);
      } else {
        // Create new conversation with this user
        createConversation.mutate(targetUserId);
      }
      
      // Clear URL param
      window.history.replaceState({}, '', '/messages');
    }
  }, [targetUserId, conversations, conversationsLoaded, processedUserId]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (messageInput.trim() && selectedConversationId) {
      sendMessage.mutate(messageInput);
    }
  };

  const selectedConversation = conversations.find(c => c.id === selectedConversationId);
  const otherParticipants = selectedConversation?.participants.filter(
    p => p.id !== currentUser?.id
  ) || [];

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl h-[calc(100vh-64px)] overflow-hidden flex flex-col">
      <div className="mb-6 flex items-center gap-3 shrink-0 px-2">
        <div className="p-3 bg-pink-100 dark:bg-pink-900/30 rounded-xl">
          <MessageCircle className="h-8 w-8 text-pink-600" />
        </div>
        <div>
          <h1 className="text-3xl font-heading font-bold">Messages</h1>
          <p className="text-muted-foreground">Connect and collaborate with your network</p>
        </div>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-12 gap-4 h-full">
        {/* Conversations List */}
        <Card className="col-span-12 md:col-span-4 p-4 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Conversations</h2>
            <Dialog open={newConversationOpen} onOpenChange={setNewConversationOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="default" data-testid="button-new-conversation">
                  <Plus className="h-4 w-4 mr-2" />
                  New
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Start New Conversation</DialogTitle>
                  <DialogDescription>
                    Search for someone to start chatting with
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, email, university, or company..."
                      className="pl-10"
                      value={userSearchTerm}
                      onChange={(e) => setUserSearchTerm(e.target.value)}
                      data-testid="input-search-users"
                    />
                  </div>
                  <ScrollArea className="h-[300px]">
                    {userSearchTerm.length < 3 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        Type at least 3 characters to search
                      </p>
                    ) : userSearchResults.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No users found
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {userSearchResults.map((user) => (
                          <div
                            key={user.id}
                            className="flex items-center justify-between p-3 rounded-md hover-elevate"
                            data-testid={`user-result-${user.id}`}
                          >
                            <div className="flex items-center gap-3">
                              <UserAvatar user={user} size="md" />
                              <div>
                                <p className="font-medium">
                                  {user.firstName} {user.lastName}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {user.role === 'student' && user.major}
                                  {user.role === 'teacher' && 'Teacher'}
                                  {user.role === 'industry_professional' && user.company}
                                  {user.role === 'university_admin' && user.university}
                                </p>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => createConversation.mutate(user.id)}
                              disabled={createConversation.isPending}
                              data-testid={`button-message-${user.id}`}
                            >
                              <MessageCircle className="h-4 w-4 mr-2" />
                              Message
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <ScrollArea className="flex-1">
            {conversations.length === 0 ? (
              <div className="text-center py-8">
                <MessageCircle className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  No conversations yet
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {conversations.map((conversation) => {
                  const otherUser = conversation.participants.find(
                    p => p.id !== currentUser?.id
                  );
                  if (!otherUser) return null;

                  return (
                    <div
                      key={conversation.id}
                      className={`p-3 rounded-md cursor-pointer hover-elevate ${
                        selectedConversationId === conversation.id ? 'bg-accent' : ''
                      }`}
                      onClick={() => setSelectedConversationId(conversation.id)}
                      data-testid={`conversation-${conversation.id}`}
                    >
                      <div className="flex items-start gap-3">
                        <UserAvatar user={otherUser} size="md" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="font-medium truncate">
                              {otherUser.firstName} {otherUser.lastName}
                            </p>
                            {conversation.unreadCount > 0 && (
                              <Badge 
                                variant="default" 
                                className="ml-2 min-w-[1.25rem] justify-center"
                                data-testid={`badge-unread-${conversation.id}`}
                              >
                                {conversation.unreadCount}
                              </Badge>
                            )}
                          </div>
                          {conversation.lastMessage && (
                            <p className="text-sm text-muted-foreground truncate">
                              {conversation.lastMessage.content}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </Card>

        {/* Chat Window */}
        <Card className="col-span-12 md:col-span-8 p-4 flex flex-col min-h-0">
          {!selectedConversationId ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageCircle className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="font-semibold text-lg mb-2">Select a conversation</h3>
                <p className="text-muted-foreground">
                  Choose a conversation from the list to start messaging
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="border-b pb-4 mb-4 shrink-0">
                <div className="flex items-center gap-3">
                  {otherParticipants.map(user => (
                    <div key={user.id} className="flex items-center gap-3">
                      <UserAvatar user={user} size="md" />
                      <div>
                        <p className="font-semibold">
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {user.role.replace('_', ' ')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 pr-4">
                <div className="space-y-4">
                  {messages.map(({ message, sender }) => {
                    const isCurrentUser = sender.id === currentUser?.id;
                    return (
                      <div
                        key={message.id}
                        className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                        data-testid={`message-${message.id}`}
                      >
                        <div className={`max-w-[70%] ${isCurrentUser ? 'items-end' : 'items-start'} flex flex-col`}>
                          <div
                            className={`rounded-lg px-4 py-2 ${
                              isCurrentUser
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted'
                            }`}
                          >
                            <p className="text-sm">{message.content}</p>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {message.createdAt && formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Message Input */}
              <form onSubmit={handleSendMessage} className="mt-4 flex gap-2 shrink-0">
                <Input
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder="Type a message..."
                  data-testid="input-message"
                />
                <Button
                  type="submit"
                  disabled={!messageInput.trim() || sendMessage.isPending}
                  data-testid="button-send-message"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
