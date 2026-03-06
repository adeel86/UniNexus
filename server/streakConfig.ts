/**
 * Streak Activity Configuration
 * Defines all activities that trigger streak updates with their rules and anti-spam measures
 */

export type ActivityType = 
  // Feed activities
  | 'POST_CREATION'
  | 'COMMENT_CREATION'
  | 'REACTION_CREATION'
  | 'REGISTRATION'
  
  // Group activities
  | 'GROUP_CREATION'
  | 'GROUP_JOIN'
  | 'GROUP_POST'
  
  // Q&A activities
  | 'QA_QUESTION'
  | 'QA_ANSWER'
  | 'QA_UPVOTE'
  
  // Course activities
  | 'COURSE_CREATION'
  | 'COURSE_ENROLLMENT'
  | 'COURSE_DISCUSSION'
  | 'COURSE_REPLY'
  | 'COURSE_UPVOTE'
  | 'COURSE_REPLY_UPVOTE'
  | 'COURSE_VALIDATION'
  
  // Challenge activities
  | 'CHALLENGE_CREATION'
  | 'CHALLENGE_JOIN'
  | 'CHALLENGE_SUBMIT'
  
  // Networking activities
  | 'CONNECTION_REQUEST'
  | 'CONNECTION_ACCEPT'
  | 'USER_FOLLOW'
  | 'DIRECT_MESSAGE';

export interface StreakActivityConfig {
  name: string;
  category: 'feed' | 'groups' | 'qa' | 'courses' | 'challenges' | 'networking' | 'content';
  points?: number;
  spamPrevention: 'none' | 'one_per_day' | 'one_per_hour';
  roles: ('student' | 'teacher' | 'industry_professional' | 'university_admin' | 'master_admin')[];
  description: string;
}

/**
 * Activity configuration mapping
 * Define each activity that triggers streak updates
 */
export const STREAK_ACTIVITIES: Record<ActivityType, StreakActivityConfig> = {
  // ============ FEED ACTIVITIES ============
  POST_CREATION: {
    name: 'post_creation',
    category: 'feed',
    points: 10,
    spamPrevention: 'none', // Quality barrier: requires content
    roles: ['student', 'teacher', 'industry_professional', 'master_admin'],
    description: 'Creating a post in the feed',
  },

  COMMENT_CREATION: {
    name: 'comment_creation',
    category: 'feed',
    points: 5,
    spamPrevention: 'one_per_day', // Can be spammed, limit to once per day
    roles: ['student', 'teacher', 'industry_professional', 'master_admin'],
    description: 'Creating a comment on a post',
  },

  REACTION_CREATION: {
    name: 'reaction_creation',
    category: 'feed',
    points: 2,
    spamPrevention: 'one_per_day', // Very easy to spam, strict limit
    roles: ['student', 'teacher', 'industry_professional', 'master_admin'],
    description: 'Adding a reaction to a post or comment',
  },

  REGISTRATION: {
    name: 'registration',
    category: 'feed',
    points: 0,
    spamPrevention: 'none', // One-time only by design
    roles: ['student', 'teacher', 'industry_professional'],
    description: 'Registering for the platform',
  },

  // ============ GROUP ACTIVITIES ============
  GROUP_CREATION: {
    name: 'group_creation',
    category: 'groups',
    points: 15,
    spamPrevention: 'none', // Quality barrier: requires effort and description
    roles: ['student', 'teacher', 'industry_professional', 'master_admin'],
    description: 'Creating a new group',
  },

  GROUP_JOIN: {
    name: 'group_join',
    category: 'groups',
    points: 5,
    spamPrevention: 'one_per_day', // Could spam-join many groups
    roles: ['student', 'teacher', 'industry_professional', 'master_admin'],
    description: 'Joining a group',
  },

  GROUP_POST: {
    name: 'group_post',
    category: 'groups',
    points: 8,
    spamPrevention: 'none', // Quality barrier: group context, requires content
    roles: ['student', 'teacher', 'industry_professional', 'master_admin'],
    description: 'Creating a post in a group',
  },

  // ============ Q&A ACTIVITIES ============
  QA_QUESTION: {
    name: 'qa_question',
    category: 'qa',
    points: 15,
    spamPrevention: 'none', // Quality barrier: requires research and thought
    roles: ['student', 'teacher', 'industry_professional', 'master_admin'],
    description: 'Posting a question in Q&A',
  },

  QA_ANSWER: {
    name: 'qa_answer',
    category: 'qa',
    points: 15,
    spamPrevention: 'none', // Quality barrier: requires knowledge
    roles: ['student', 'teacher', 'industry_professional', 'master_admin'],
    description: 'Providing an answer to a Q&A question',
  },

  QA_UPVOTE: {
    name: 'qa_upvote',
    category: 'qa',
    points: 3,
    spamPrevention: 'one_per_day', // Easy to spam, strict limit
    roles: ['student', 'teacher', 'industry_professional', 'master_admin'],
    description: 'Upvoting a Q&A question or answer',
  },

  // ============ COURSE ACTIVITIES ============
  COURSE_CREATION: {
    name: 'course_creation',
    category: 'courses',
    points: 20,
    spamPrevention: 'none', // Quality barrier: teacher-only, requires full course setup
    roles: ['teacher', 'university_admin', 'master_admin'],
    description: 'Creating a new course',
  },

  COURSE_ENROLLMENT: {
    name: 'course_enrollment',
    category: 'courses',
    points: 5,
    spamPrevention: 'none', // One-time per course, quality barrier
    roles: ['student', 'industry_professional'],
    description: 'Enrolling in a course',
  },

  COURSE_DISCUSSION: {
    name: 'course_discussion',
    category: 'courses',
    points: 8,
    spamPrevention: 'none', // Quality barrier: course context
    roles: ['student', 'teacher', 'master_admin'],
    description: 'Creating a discussion in a course',
  },

  COURSE_REPLY: {
    name: 'course_reply',
    category: 'courses',
    points: 5,
    spamPrevention: 'none', // Quality barrier: course context, replying to discussion
    roles: ['student', 'teacher', 'master_admin'],
    description: 'Replying to a course discussion',
  },

  COURSE_UPVOTE: {
    name: 'course_upvote',
    category: 'courses',
    points: 2,
    spamPrevention: 'one_per_day', // Easy to spam upvotes
    roles: ['student', 'teacher', 'master_admin'],
    description: 'Upvoting a course discussion',
  },

  COURSE_REPLY_UPVOTE: {
    name: 'course_reply_upvote',
    category: 'courses',
    points: 2,
    spamPrevention: 'one_per_day', // Easy to spam upvotes
    roles: ['student', 'teacher', 'master_admin'],
    description: 'Upvoting a course discussion reply',
  },

  COURSE_VALIDATION: {
    name: 'course_validation',
    category: 'courses',
    points: 5,
    spamPrevention: 'none', // Quality barrier: validates student achievement
    roles: ['teacher', 'university_admin', 'master_admin'],
    description: 'Validating a student course completion',
  },

  // ============ CHALLENGE ACTIVITIES ============
  CHALLENGE_CREATION: {
    name: 'challenge_creation',
    category: 'challenges',
    points: 20,
    spamPrevention: 'none', // Quality barrier: teacher-only, significant effort
    roles: ['teacher', 'university_admin', 'master_admin'],
    description: 'Creating a new challenge',
  },

  CHALLENGE_JOIN: {
    name: 'challenge_join',
    category: 'challenges',
    points: 10,
    spamPrevention: 'none', // One-time per challenge, quality barrier
    roles: ['student', 'industry_professional'],
    description: 'Joining a challenge',
  },

  CHALLENGE_SUBMIT: {
    name: 'challenge_submit',
    category: 'challenges',
    points: 20,
    spamPrevention: 'none', // Quality barrier: requires solution
    roles: ['student', 'industry_professional'],
    description: 'Submitting a solution to a challenge',
  },

  // ============ NETWORKING ACTIVITIES ============
  CONNECTION_REQUEST: {
    name: 'connection_request',
    category: 'networking',
    points: 3,
    spamPrevention: 'one_per_day', // Could spam connection requests
    roles: ['student', 'teacher', 'industry_professional', 'master_admin'],
    description: 'Sending a connection request',
  },

  CONNECTION_ACCEPT: {
    name: 'connection_accept',
    category: 'networking',
    points: 3,
    spamPrevention: 'one_per_day', // Could spam accepting connections
    roles: ['student', 'teacher', 'industry_professional', 'master_admin'],
    description: 'Accepting a connection request',
  },

  USER_FOLLOW: {
    name: 'user_follow',
    category: 'networking',
    points: 2,
    spamPrevention: 'one_per_day', // Easy to spam following
    roles: ['student', 'teacher', 'industry_professional', 'master_admin'],
    description: 'Following a user',
  },

  DIRECT_MESSAGE: {
    name: 'direct_message',
    category: 'networking',
    points: 1,
    spamPrevention: 'one_per_hour', // Can message frequently, but limit to hourly
    roles: ['student', 'teacher', 'industry_professional', 'master_admin'],
    description: 'Sending a direct message',
  },
};

/**
 * Get activity configuration
 */
export function getActivityConfig(activityType: ActivityType): StreakActivityConfig {
  const config = STREAK_ACTIVITIES[activityType];
  if (!config) {
    throw new Error(`Unknown activity type: ${activityType}`);
  }
  return config;
}

/**
 * Check if a role is eligible for an activity
 */
export function isRoleEligible(activityType: ActivityType, role: string): boolean {
  const config = getActivityConfig(activityType);
  return config.roles.includes(role as any);
}

/**
 * Get description of spam prevention for an activity
 */
export function getSpamPreventionDescription(activityType: ActivityType): string {
  const config = getActivityConfig(activityType);
  switch (config.spamPrevention) {
    case 'none':
      return 'No limit (quality barrier prevents spam)';
    case 'one_per_day':
      return 'Maximum once per day';
    case 'one_per_hour':
      return 'Maximum once per hour';
  }
}
