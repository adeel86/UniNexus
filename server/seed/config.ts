/**
 * Seed Profile Configuration
 * 
 * Defines data volume for three seed profiles:
 * - minimal: Quick setup with demo accounts and essential data
 * - standard: Realistic data for development and testing (default)
 * - comprehensive: Large dataset for stress testing and realistic scenarios
 */

export type SeedProfile = 'minimal' | 'standard' | 'comprehensive';

export interface SeedConfig {
  profile: SeedProfile;
  users: {
    demoAccountsOnly: boolean;
    bulkUserCount: number;
  };
  posts: {
    perUser: number;
    totalMin: number;
  };
  courses: {
    count: number;
    enrollmentRate: number; // 0.0 to 1.0
  };
  groups: {
    count: number;
    membershipRate: number;
  };
  challenges: {
    count: number;
    participationRate: number;
  };
  connections: {
    connectionRate: number; // 0.0 to 1.0
    followRate: number;
  };
  social: {
    commentsPerPost: number;
    reactionsPerPost: number;
    endorsementsPerUser: number;
    messagesPerConversation: number;
  };
  education: {
    recordsPerUser: number;
  };
  aiData: {
    aiEventsPerUser: number;
    chatSessionsPerUser: number;
    chatMessagesPerSession: number;
  };
  gamification: {
    badgesPerUser: number;
    certificatesPerUser: number;
    notificationsPerUser: number;
  };
}

export const seedProfiles: Record<SeedProfile, SeedConfig> = {
  minimal: {
    profile: 'minimal',
    users: {
      demoAccountsOnly: true,
      bulkUserCount: 0,
    },
    posts: {
      perUser: 1,
      totalMin: 5,
    },
    courses: {
      count: 2,
      enrollmentRate: 0.3,
    },
    groups: {
      count: 1,
      membershipRate: 0.2,
    },
    challenges: {
      count: 0,
      participationRate: 0,
    },
    connections: {
      connectionRate: 0.1,
      followRate: 0.1,
    },
    social: {
      commentsPerPost: 1,
      reactionsPerPost: 1,
      endorsementsPerUser: 1,
      messagesPerConversation: 3,
    },
    education: {
      recordsPerUser: 0.5,
    },
    aiData: {
      aiEventsPerUser: 0,
      chatSessionsPerUser: 0,
      chatMessagesPerSession: 0,
    },
    gamification: {
      badgesPerUser: 1,
      certificatesPerUser: 0,
      notificationsPerUser: 2,
    },
  },

  standard: {
    profile: 'standard',
    users: {
      demoAccountsOnly: false,
      bulkUserCount: 50,
    },
    posts: {
      perUser: 3,
      totalMin: 100,
    },
    courses: {
      count: 8,
      enrollmentRate: 0.6,
    },
    groups: {
      count: 5,
      membershipRate: 0.4,
    },
    challenges: {
      count: 2,
      participationRate: 0.3,
    },
    connections: {
      connectionRate: 0.3,
      followRate: 0.4,
    },
    social: {
      commentsPerPost: 5,
      reactionsPerPost: 8,
      endorsementsPerUser: 5,
      messagesPerConversation: 10,
    },
    education: {
      recordsPerUser: 1.5,
    },
    aiData: {
      aiEventsPerUser: 2,
      chatSessionsPerUser: 2,
      chatMessagesPerSession: 5,
    },
    gamification: {
      badgesPerUser: 3,
      certificatesPerUser: 1,
      notificationsPerUser: 8,
    },
  },

  comprehensive: {
    profile: 'comprehensive',
    users: {
      demoAccountsOnly: false,
      bulkUserCount: 200,
    },
    posts: {
      perUser: 8,
      totalMin: 500,
    },
    courses: {
      count: 20,
      enrollmentRate: 0.8,
    },
    groups: {
      count: 15,
      membershipRate: 0.7,
    },
    challenges: {
      count: 5,
      participationRate: 0.6,
    },
    connections: {
      connectionRate: 0.6,
      followRate: 0.7,
    },
    social: {
      commentsPerPost: 15,
      reactionsPerPost: 25,
      endorsementsPerUser: 12,
      messagesPerConversation: 30,
    },
    education: {
      recordsPerUser: 2.5,
    },
    aiData: {
      aiEventsPerUser: 5,
      chatSessionsPerUser: 5,
      chatMessagesPerSession: 15,
    },
    gamification: {
      badgesPerUser: 6,
      certificatesPerUser: 3,
      notificationsPerUser: 15,
    },
  },
};

/**
 * Get seed profile by name, with fallback to 'standard'
 */
export function getSeedProfile(profileName?: string): SeedConfig {
  const profile = (profileName as SeedProfile) || 'standard';
  return seedProfiles[profile] || seedProfiles.standard;
}

/**
 * Parse command-line argument for seed profile
 * Usage: npm run db:seed -- minimal|standard|comprehensive
 */
export function parseSeedProfile(args?: string[]): SeedProfile {
  if (!args || args.length === 0) return 'standard';
  
  const arg = args[args.length - 1]?.toLowerCase();
  if (arg === 'minimal' || arg === 'standard' || arg === 'comprehensive') {
    return arg;
  }
  
  return 'standard';
}
