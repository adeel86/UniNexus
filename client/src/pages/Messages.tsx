import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { User, Conversation, Message } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UserAvatar } from "@/components/UserAvatar";
import { Send, MessageCircle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/AuthContext";
import { formatDistanceToNow } from "date-fns";

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
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Get all conversations
  const { data: conversations = [] } = useQuery<EnrichedConversation[]>({
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
    <div className="container mx-auto px-4 py-6 max-w-7xl h-[calc(100vh-8rem)]">
      <div className="mb-4">
        <h1 className="font-heading text-3xl font-bold">Messages</h1>
      </div>

      <div className="grid grid-cols-12 gap-4 h-full">
        {/* Conversations List */}
        <Card className="col-span-12 md:col-span-4 p-4 flex flex-col">
          <h2 className="font-semibold mb-4">Conversations</h2>
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
                              <span className="bg-primary text-primary-foreground text-xs font-bold rounded-full px-2 py-0.5">
                                {conversation.unreadCount}
                              </span>
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
        <Card className="col-span-12 md:col-span-8 p-4 flex flex-col">
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
              <div className="border-b pb-4 mb-4">
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
              <form onSubmit={handleSendMessage} className="mt-4 flex gap-2">
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
