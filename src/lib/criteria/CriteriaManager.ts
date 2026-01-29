/**
 * CriteriaManager
 * CRUD operations for criteria templates and scoring calculations
 */

import type {
  Criterion,
  CriteriaProfile,
  CriteriaProfileExport,
  ItemCriteriaScores,
  CriterionScore,
  RankingSuggestion,
  WeightedScoreOptions,
  ConsensusData,
} from './types';
import { DEFAULT_SCORE_OPTIONS, DEFAULT_CRITERION } from './types';

/**
 * Generate a unique ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate a share code from profile data
 */
function generateShareCode(profile: CriteriaProfile): string {
  const data = {
    n: profile.name,
    c: profile.category,
    cr: profile.criteria.map((c) => ({
      n: c.name,
      w: c.weight,
      d: c.description.slice(0, 50),
    })),
  };
  const json = JSON.stringify(data);
  return btoa(encodeURIComponent(json)).replace(/=/g, '').slice(0, 32);
}

/**
 * CriteriaManager class
 * Handles all criteria-related operations
 */
export class CriteriaManager {
  private profiles: Map<string, CriteriaProfile> = new Map();
  private itemScores: Map<string, ItemCriteriaScores> = new Map();
  private options: WeightedScoreOptions;

  constructor(options: Partial<WeightedScoreOptions> = {}) {
    this.options = { ...DEFAULT_SCORE_OPTIONS, ...options };
  }

  // ===================
  // Profile Operations
  // ===================

  /**
   * Create a new criteria profile
   */
  createProfile(
    data: Omit<CriteriaProfile, 'id' | 'createdAt' | 'updatedAt'>
  ): CriteriaProfile {
    const now = new Date().toISOString();
    const profile: CriteriaProfile = {
      ...data,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
      shareCode: undefined,
    };

    this.profiles.set(profile.id, profile);
    return profile;
  }

  /**
   * Get a profile by ID
   */
  getProfile(id: string): CriteriaProfile | null {
    return this.profiles.get(id) ?? null;
  }

  /**
   * Get all profiles
   */
  getAllProfiles(): CriteriaProfile[] {
    return Array.from(this.profiles.values());
  }

  /**
   * Get profiles by category
   */
  getProfilesByCategory(category: string): CriteriaProfile[] {
    return Array.from(this.profiles.values()).filter(
      (p) => p.category === category || p.category === 'universal'
    );
  }

  /**
   * Get template profiles only
   */
  getTemplates(): CriteriaProfile[] {
    return Array.from(this.profiles.values()).filter((p) => p.isTemplate);
  }

  /**
   * Get custom profiles only
   */
  getCustomProfiles(): CriteriaProfile[] {
    return Array.from(this.profiles.values()).filter((p) => !p.isTemplate);
  }

  /**
   * Update a profile
   */
  updateProfile(id: string, updates: Partial<CriteriaProfile>): CriteriaProfile | null {
    const profile = this.profiles.get(id);
    if (!profile) return null;

    const updated: CriteriaProfile = {
      ...profile,
      ...updates,
      id: profile.id, // Prevent ID change
      isTemplate: profile.isTemplate, // Prevent template status change
      createdAt: profile.createdAt,
      updatedAt: new Date().toISOString(),
    };

    this.profiles.set(id, updated);
    return updated;
  }

  /**
   * Delete a profile
   */
  deleteProfile(id: string): boolean {
    const profile = this.profiles.get(id);
    if (!profile || profile.isTemplate) return false;
    return this.profiles.delete(id);
  }

  /**
   * Duplicate a profile
   */
  duplicateProfile(id: string, newName: string): CriteriaProfile | null {
    const original = this.profiles.get(id);
    if (!original) return null;

    return this.createProfile({
      name: newName,
      description: `Copy of ${original.name}`,
      category: original.category,
      criteria: original.criteria.map((c) => ({ ...c, id: generateId() })),
      isTemplate: false,
      createdBy: null,
    });
  }

  // ===================
  // Criterion Operations
  // ===================

  /**
   * Add a criterion to a profile
   */
  addCriterion(
    profileId: string,
    data: Omit<Criterion, 'id'>
  ): Criterion | null {
    const profile = this.profiles.get(profileId);
    if (!profile || profile.isTemplate) return null;

    const criterion: Criterion = {
      ...DEFAULT_CRITERION,
      ...data,
      id: generateId(),
    };

    profile.criteria.push(criterion);
    profile.updatedAt = new Date().toISOString();
    this.profiles.set(profileId, profile);

    return criterion;
  }

  /**
   * Update a criterion
   */
  updateCriterion(
    profileId: string,
    criterionId: string,
    updates: Partial<Criterion>
  ): boolean {
    const profile = this.profiles.get(profileId);
    if (!profile || profile.isTemplate) return false;

    const index = profile.criteria.findIndex((c) => c.id === criterionId);
    if (index === -1) return false;

    profile.criteria[index] = {
      ...profile.criteria[index],
      ...updates,
      id: criterionId, // Prevent ID change
    };
    profile.updatedAt = new Date().toISOString();
    this.profiles.set(profileId, profile);

    return true;
  }

  /**
   * Remove a criterion from a profile
   */
  removeCriterion(profileId: string, criterionId: string): boolean {
    const profile = this.profiles.get(profileId);
    if (!profile || profile.isTemplate) return false;

    const initialLength = profile.criteria.length;
    profile.criteria = profile.criteria.filter((c) => c.id !== criterionId);

    if (profile.criteria.length === initialLength) return false;

    profile.updatedAt = new Date().toISOString();
    this.profiles.set(profileId, profile);
    return true;
  }

  /**
   * Reorder criteria in a profile
   */
  reorderCriteria(profileId: string, fromIndex: number, toIndex: number): boolean {
    const profile = this.profiles.get(profileId);
    if (!profile || profile.isTemplate) return false;
    if (fromIndex < 0 || fromIndex >= profile.criteria.length) return false;
    if (toIndex < 0 || toIndex >= profile.criteria.length) return false;

    const [removed] = profile.criteria.splice(fromIndex, 1);
    profile.criteria.splice(toIndex, 0, removed);

    profile.updatedAt = new Date().toISOString();
    this.profiles.set(profileId, profile);
    return true;
  }

  // ===================
  // Scoring Operations
  // ===================

  /**
   * Set score for a single criterion on an item
   */
  setItemScore(
    itemId: string,
    profileId: string,
    criterionId: string,
    score: number,
    note?: string
  ): boolean {
    const profile = this.profiles.get(profileId);
    if (!profile) return false;

    const criterion = profile.criteria.find((c) => c.id === criterionId);
    if (!criterion) return false;

    // Clamp score to valid range
    const clampedScore = Math.max(
      criterion.minScore,
      Math.min(criterion.maxScore, score)
    );

    const key = `${itemId}:${profileId}`;
    let itemScores = this.itemScores.get(key);

    if (!itemScores) {
      itemScores = {
        itemId,
        profileId,
        scores: [],
        weightedScore: 0,
        scoredAt: new Date().toISOString(),
      };
    }

    // Update or add the criterion score
    const existingIndex = itemScores.scores.findIndex(
      (s) => s.criterionId === criterionId
    );

    const criterionScore: CriterionScore = {
      criterionId,
      score: clampedScore,
      note,
    };

    if (existingIndex >= 0) {
      itemScores.scores[existingIndex] = criterionScore;
    } else {
      itemScores.scores.push(criterionScore);
    }

    // Recalculate weighted score
    itemScores.weightedScore = this.calculateWeightedScore(
      itemScores.scores,
      profile.criteria
    );
    itemScores.scoredAt = new Date().toISOString();

    this.itemScores.set(key, itemScores);
    return true;
  }

  /**
   * Get scores for an item
   */
  getItemScores(itemId: string, profileId: string): ItemCriteriaScores | null {
    const key = `${itemId}:${profileId}`;
    return this.itemScores.get(key) ?? null;
  }

  /**
   * Set justification for an item
   */
  setItemJustification(
    itemId: string,
    profileId: string,
    justification: string
  ): boolean {
    const key = `${itemId}:${profileId}`;
    const itemScores = this.itemScores.get(key);
    if (!itemScores) return false;

    itemScores.justification = justification;
    this.itemScores.set(key, itemScores);
    return true;
  }

  /**
   * Calculate weighted score from criterion scores
   */
  calculateWeightedScore(
    scores: CriterionScore[],
    criteria: Criterion[]
  ): number {
    if (scores.length === 0 || criteria.length === 0) return 0;

    const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0);
    if (totalWeight === 0) return 0;

    let weightedSum = 0;

    for (const score of scores) {
      const criterion = criteria.find((c) => c.id === score.criterionId);
      if (!criterion) continue;

      // Normalize score to 0-1 range
      const normalizedScore =
        (score.score - criterion.minScore) /
        (criterion.maxScore - criterion.minScore);

      // Apply weight
      weightedSum += normalizedScore * criterion.weight;
    }

    // Normalize to 0-100 scale
    let result = (weightedSum / totalWeight) * 100;

    if (this.options.roundResult) {
      const factor = Math.pow(10, this.options.decimalPlaces);
      result = Math.round(result * factor) / factor;
    }

    return result;
  }

  /**
   * Clear scores for an item
   */
  clearItemScores(itemId: string, profileId: string): boolean {
    const key = `${itemId}:${profileId}`;
    return this.itemScores.delete(key);
  }

  /**
   * Clear all scores
   */
  clearAllScores(): void {
    this.itemScores.clear();
  }

  // ===================
  // Ranking Suggestions
  // ===================

  /**
   * Generate ranking suggestions based on criteria scores
   */
  getRankingSuggestions(
    itemIds: string[],
    profileId: string
  ): RankingSuggestion[] {
    const profile = this.profiles.get(profileId);
    if (!profile) return [];

    const itemsWithScores: Array<{
      itemId: string;
      weightedScore: number;
      hasAllScores: boolean;
    }> = [];

    for (const itemId of itemIds) {
      const scores = this.getItemScores(itemId, profileId);
      if (!scores) {
        itemsWithScores.push({
          itemId,
          weightedScore: 0,
          hasAllScores: false,
        });
        continue;
      }

      const hasAllScores = profile.criteria.every((c) =>
        scores.scores.some((s) => s.criterionId === c.id)
      );

      itemsWithScores.push({
        itemId,
        weightedScore: scores.weightedScore,
        hasAllScores,
      });
    }

    // Sort by weighted score descending
    itemsWithScores.sort((a, b) => b.weightedScore - a.weightedScore);

    // Generate suggestions
    return itemsWithScores.map((item, index) => ({
      itemId: item.itemId,
      suggestedPosition: index + 1,
      weightedScore: item.weightedScore,
      confidence: item.hasAllScores ? 1 : 0.5,
      reasoning: item.hasAllScores
        ? `Ranked #${index + 1} with score ${item.weightedScore.toFixed(1)}`
        : `Partial score: ${item.weightedScore.toFixed(1)} (incomplete criteria)`,
    }));
  }

  // ===================
  // Consensus Tracking
  // ===================

  /**
   * Calculate consensus data for an item across multiple users
   * This would typically aggregate data from a backend, but for now
   * we provide the calculation logic
   */
  calculateConsensus(
    userScores: ItemCriteriaScores[],
    profileId: string
  ): ConsensusData | null {
    if (userScores.length === 0) return null;

    const profile = this.profiles.get(profileId);
    if (!profile) return null;

    const itemId = userScores[0].itemId;
    const criterionAverages: Record<string, number> = {};
    const criterionStdDevs: Record<string, number> = {};

    // Calculate averages and standard deviations for each criterion
    for (const criterion of profile.criteria) {
      const scores = userScores
        .map((us) => us.scores.find((s) => s.criterionId === criterion.id)?.score)
        .filter((s): s is number => s !== undefined);

      if (scores.length === 0) continue;

      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      criterionAverages[criterion.id] = avg;

      const variance =
        scores.reduce((sum, s) => sum + Math.pow(s - avg, 2), 0) / scores.length;
      criterionStdDevs[criterion.id] = Math.sqrt(variance);
    }

    // Calculate overall weighted score average
    const weightedScores = userScores.map((us) => us.weightedScore);
    const avgWeightedScore =
      weightedScores.reduce((a, b) => a + b, 0) / weightedScores.length;

    // Determine agreement level based on average std dev
    const stdDevs = Object.values(criterionStdDevs);
    const avgStdDev =
      stdDevs.length > 0 ? stdDevs.reduce((a, b) => a + b, 0) / stdDevs.length : 0;

    let agreementLevel: 'high' | 'medium' | 'low';
    if (avgStdDev < 1) {
      agreementLevel = 'high';
    } else if (avgStdDev < 2) {
      agreementLevel = 'medium';
    } else {
      agreementLevel = 'low';
    }

    return {
      itemId,
      profileId,
      userCount: userScores.length,
      criterionAverages,
      criterionStdDevs,
      averageWeightedScore: avgWeightedScore,
      agreementLevel,
    };
  }

  // ===================
  // Import/Export
  // ===================

  /**
   * Generate a share code for a profile
   */
  generateShareCode(profileId: string): string | null {
    const profile = this.profiles.get(profileId);
    if (!profile) return null;

    const shareCode = generateShareCode(profile);
    profile.shareCode = shareCode;
    this.profiles.set(profileId, profile);

    return shareCode;
  }

  /**
   * Export a profile
   */
  exportProfile(profileId: string): CriteriaProfileExport | null {
    const profile = this.profiles.get(profileId);
    if (!profile) return null;

    const { id, createdAt, updatedAt, usageCount, ...rest } = profile;

    return {
      version: '1.0',
      profile: rest,
      exportedAt: new Date().toISOString(),
    };
  }

  /**
   * Import a profile from export data
   */
  importProfile(data: CriteriaProfileExport): CriteriaProfile | null {
    if (!data.version || !data.profile) return null;

    return this.createProfile({
      ...data.profile,
      criteria: data.profile.criteria.map((c) => ({ ...c, id: generateId() })),
      isTemplate: false,
    });
  }

  // ===================
  // Initialization
  // ===================

  /**
   * Load templates from provided data
   */
  loadTemplates(templates: CriteriaProfile[]): void {
    for (const template of templates) {
      this.profiles.set(template.id, {
        ...template,
        isTemplate: true,
      });
    }
  }

  /**
   * Load profiles from stored data
   */
  loadProfiles(profiles: CriteriaProfile[]): void {
    for (const profile of profiles) {
      this.profiles.set(profile.id, profile);
    }
  }

  /**
   * Load item scores from stored data
   */
  loadItemScores(scores: ItemCriteriaScores[]): void {
    for (const score of scores) {
      const key = `${score.itemId}:${score.profileId}`;
      this.itemScores.set(key, score);
    }
  }

  /**
   * Get all item scores for export/persistence
   */
  getAllItemScores(): ItemCriteriaScores[] {
    return Array.from(this.itemScores.values());
  }
}

/**
 * Create a criteria manager instance
 */
export function createCriteriaManager(
  options?: Partial<WeightedScoreOptions>
): CriteriaManager {
  return new CriteriaManager(options);
}

/**
 * Default criteria manager instance
 */
export const defaultCriteriaManager = new CriteriaManager();
