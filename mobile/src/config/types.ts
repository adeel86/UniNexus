export type UserRole = 'student' | 'teacher' | 'university' | 'university_admin' | 'industry' | 'master_admin';

export interface User {
  id: number;
  email: string;
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  role: UserRole;
  university: string | null;
  department: string | null;
  avatarUrl: string | null;
  bio: string | null;
  skills: string[];
  points: number;
  challengePoints: number;
  rankTier: string;
}

export interface Post {
  id: number;
  userId: number;
  content: string;
  mediaUrls: string[];
  mediaType: string | null;
  createdAt: string;
  user?: User;
  reactions: Reaction[];
  commentCount: number;
}

export interface Reaction {
  id: number;
  postId: number;
  userId: number;
  type: string;
}

export interface Comment {
  id: number;
  postId: number;
  userId: number;
  content: string;
  createdAt: string;
  user?: User;
}

export interface Message {
  id: number;
  conversationId: number;
  senderId: number;
  content: string;
  createdAt: string;
  isRead: boolean;
  sender?: User;
}

export interface Conversation {
  id: number;
  participants: User[];
  lastMessage: Message | null;
  unreadCount: number;
  updatedAt: string;
}

export interface Course {
  id: number;
  title: string;
  description: string | null;
  code: string | null;
  instructorId: number;
  instructor?: User;
  isValidated: boolean;
  validationStatus: string;
  materialCount: number;
}

export interface TeacherContent {
  id: number;
  courseId: number;
  title: string;
  description: string | null;
  contentType: string;
  fileUrl: string | null;
  createdAt: string;
}

export interface Group {
  id: number;
  name: string;
  description: string | null;
  imageUrl: string | null;
  isPrivate: boolean;
  memberCount: number;
  createdAt: string;
}

export interface Challenge {
  id: number;
  title: string;
  description: string | null;
  type: string;
  startDate: string;
  endDate: string;
  pointsReward: number;
  maxParticipants: number | null;
  currentParticipants: number;
  status: string;
}

export interface Notification {
  id: number;
  userId: number;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  metadata: Record<string, any> | null;
}

export interface Badge {
  id: number;
  name: string;
  description: string;
  iconUrl: string | null;
  category: string;
}

export interface UserBadge {
  id: number;
  userId: number;
  badgeId: number;
  badge: Badge;
  earnedAt: string;
}

export interface Skill {
  id: number;
  name: string;
  category: string;
}

export interface UserSkill {
  id: number;
  userId: number;
  skillId: number;
  skill: Skill;
  endorsementCount: number;
}

export interface Connection {
  id: number;
  requesterId: number;
  addresseeId: number;
  status: 'pending' | 'accepted' | 'rejected';
  requester?: User;
  addressee?: User;
}

export type RootStackParamList = {
  Login: undefined;
  SignUp: undefined;
  Main: undefined;
  PostDetail: { postId: number };
  Profile: { userId: number };
  CourseDetail: { courseId: number };
  GroupDetail: { groupId: number };
  ChallengeDetail: { challengeId: number };
  Chat: { conversationId: number };
  Settings: undefined;
  EditProfile: undefined;
  AskTeacherAI: { courseId: number; courseTitle: string };
  CVExport: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Network: undefined;
  Messages: undefined;
  Courses: undefined;
  Groups: undefined;
  Challenges: undefined;
  Notifications: undefined;
  ProfileTab: undefined;
};
