import { BadgeDefinition, BadgeType } from '@/types/challenges';

export const BADGE_DEFINITIONS: Record<BadgeType, BadgeDefinition> = {
  first_place: {
    type: 'first_place',
    name: 'Champion',
    description: 'Achieved first place in a challenge',
    icon: '🏆',
    color: '#FFD700',
    requirement: 'Rank #1 in any challenge',
  },
  top_10: {
    type: 'top_10',
    name: 'Elite Performer',
    description: 'Finished in the top 10 of a challenge',
    icon: '🌟',
    color: '#C0C0C0',
    requirement: 'Rank in top 10 of any challenge',
  },
  speed_master: {
    type: 'speed_master',
    name: 'Speed Master',
    description: 'Completed a challenge in record time',
    icon: '⚡',
    color: '#4F46E5',
    requirement: 'Finish in the top 10% for completion time',
  },
  consistency_king: {
    type: 'consistency_king',
    name: 'Consistency King',
    description: 'Consistently high performance across challenges',
    icon: '👑',
    color: '#8B5CF6',
    requirement: 'Achieve top 10 finishes in 5+ challenges',
  },
  category_expert: {
    type: 'category_expert',
    name: 'Category Expert',
    description: 'Mastered a specific category',
    icon: '🎯',
    color: '#06B6D4',
    requirement: 'Win 3+ challenges in the same category',
  },
  challenge_veteran: {
    type: 'challenge_veteran',
    name: 'Challenge Veteran',
    description: 'Participated in many challenges',
    icon: '🎖️',
    color: '#F59E0B',
    requirement: 'Complete 10+ challenge entries',
  },
  perfect_score: {
    type: 'perfect_score',
    name: 'Perfectionist',
    description: 'Achieved a perfect score',
    icon: '💯',
    color: '#10B981',
    requirement: 'Score 100 points in any challenge',
  },
  early_bird: {
    type: 'early_bird',
    name: 'Early Bird',
    description: 'Among the first to enter a challenge',
    icon: '🐦',
    color: '#F472B6',
    requirement: 'Submit entry within first hour of challenge start',
  },
  comeback_kid: {
    type: 'comeback_kid',
    name: 'Comeback Kid',
    description: 'Improved significantly from previous attempt',
    icon: '📈',
    color: '#EF4444',
    requirement: 'Improve rank by 10+ positions in a re-attempt',
  },
  streak_master: {
    type: 'streak_master',
    name: 'Streak Master',
    description: 'Maintained a long participation streak',
    icon: '🔥',
    color: '#FB923C',
    requirement: 'Participate in challenges for 7+ consecutive days',
  },
};

export function getBadgeDefinition(badgeType: BadgeType): BadgeDefinition {
  return BADGE_DEFINITIONS[badgeType];
}

export function getAllBadgeDefinitions(): BadgeDefinition[] {
  return Object.values(BADGE_DEFINITIONS);
}
