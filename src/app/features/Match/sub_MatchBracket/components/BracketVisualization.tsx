"use client";

import { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  BracketState,
  BracketMatchup,
  BracketParticipant,
  BracketRound,
} from '../lib/bracketGenerator';
import { useBracketDimensions } from '../lib/useBracketDimensions';
import { STAGGER, ENTRANCE, ENTRANCE_DURATION, CONNECTOR, CELEBRATION, SPRING_CONFIG, GLOW_SHADOWS } from '@/lib/animations/motion-tokens';

interface BracketVisualizationProps {
  bracket: BracketState;
  onMatchupClick: (matchup: BracketMatchup) => void;
  selectedMatchupId?: string;
}

// Colors
const COLORS = {
  connector: 'rgb(71, 85, 105)',
  connectorActive: 'rgb(34, 211, 238)',
  connectorPending: 'rgba(34, 211, 238, 0.3)',
  matchupBg: 'rgba(30, 41, 59, 0.8)',
  matchupBgActive: 'rgba(8, 145, 178, 0.2)',
  matchupBorder: 'rgba(71, 85, 105, 0.5)',
  matchupBorderActive: 'rgba(34, 211, 238, 0.6)',
  seed: 'rgb(148, 163, 184)',
};

type ConnectorState = 'default' | 'active' | 'pending';

/** Advancement animation data for a winner flowing along a connector path */
interface AdvancementAnim {
  id: string;
  matchupId: string;
  keyframesCx: number[];
  keyframesCy: number[];
  times: number[];
}

/**
 * Single participant slot in a matchup
 */
function ParticipantSlot({
  participant,
  isWinner,
}: {
  participant: BracketParticipant | null;
  isWinner: boolean;
  position: 'top' | 'bottom';
}) {
  if (!participant) {
    return (
      <div className="h-7 flex items-center gap-1.5 px-2 bg-slate-900/30 rounded">
        <svg viewBox="0 0 16 16" fill="none" width={16} height={16} className="shrink-0">
          <path d="M2 1h3v3H2zM11 1h3v3h-3zM2 12h3v3H2zM11 12h3v3h-3z" stroke="rgb(100,116,139)" strokeWidth="1.5" fill="none" />
          <path d="M5 2.5h6M5 13.5h6" stroke="rgb(100,116,139)" strokeWidth="1.5" />
          <text x="8" y="10.5" textAnchor="middle" fill="rgb(100,116,139)" fontSize="7" fontWeight="600" fontFamily="Space Grotesk, sans-serif">?</text>
        </svg>
        <span className="text-2xs text-slate-600">TBD</span>
      </div>
    );
  }

  if (participant.isBye) {
    return (
      <div className="h-7 flex items-center gap-1.5 px-2 bg-slate-800/20 rounded border border-dashed border-slate-700/30">
        <svg viewBox="0 0 16 16" fill="none" width={16} height={16} className="shrink-0">
          <line x1="3" y1="8" x2="13" y2="8" stroke="rgb(100,116,139)" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="2" y1="5" x2="14" y2="11" stroke="rgb(71,85,105)" strokeWidth="1" strokeDasharray="2 2" />
        </svg>
        <span className="text-2xs text-slate-500">BYE</span>
      </div>
    );
  }

  const title = participant.item?.title || participant.item?.name || 'Unknown';

  return (
    <div
      className={`h-7 flex items-center gap-1.5 px-1.5 rounded transition-all duration-200 ${
        isWinner
          ? 'bg-green-500/10 border border-green-500/30'
          : 'bg-slate-800/40 border border-slate-700/30'
      }`}
    >
      <span
        className="text-2xs font-bold min-w-[14px] h-3.5 flex items-center justify-center rounded bg-slate-700/50"
        style={{ color: COLORS.seed }}
      >
        {participant.seed}
      </span>

      {participant.item?.image_url && (
        <div className="w-4 h-4 rounded overflow-hidden shrink-0">
          <img
            src={participant.item.image_url}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <span
        className={`text-xs truncate flex-1 ${
          isWinner ? 'text-green-300 font-medium' : 'text-slate-300'
        }`}
      >
        {title}
      </span>

      {isWinner && (
        <div className="w-2.5 h-2.5 rounded-full bg-green-500 flex items-center justify-center">
          <div className="w-1 h-1 bg-white rounded-full" />
        </div>
      )}
    </div>
  );
}

/**
 * Single matchup card with completion flash effect
 */
function MatchupCard({
  matchup,
  onClick,
  isSelected,
  isPlayable,
  width,
  isRecentlyCompleted,
}: {
  matchup: BracketMatchup;
  onClick: () => void;
  isSelected: boolean;
  isPlayable: boolean;
  width: number;
  isRecentlyCompleted: boolean;
}) {
  const canClick = isPlayable && !matchup.isComplete;

  return (
    <motion.div
      onClick={canClick ? onClick : undefined}
      whileHover={canClick ? { scale: 1.02 } : {}}
      whileTap={canClick ? { scale: 0.98 } : {}}
      className={`
        relative rounded-card p-1 transition-all duration-200
        ${canClick ? 'cursor-pointer' : 'cursor-default'}
        ${isSelected ? 'ring-2 ring-brand-hover ring-offset-1 ring-offset-slate-900' : ''}
      `}
      style={{
        width,
        backgroundColor: isSelected ? COLORS.matchupBgActive : COLORS.matchupBg,
        border: `1px solid ${isSelected ? COLORS.matchupBorderActive : COLORS.matchupBorder}`,
      }}
    >
      <ParticipantSlot
        participant={matchup.participant1}
        isWinner={matchup.winner?.id === matchup.participant1?.id}
        position="top"
      />

      <div className="flex items-center justify-center h-3 my-0.5">
        <div className="flex-1 h-px bg-slate-700/50" />
        <span className="px-1.5 text-2xs font-bold font-grotesk text-slate-500">VS</span>
        <div className="flex-1 h-px bg-slate-700/50" />
      </div>

      <ParticipantSlot
        participant={matchup.participant2}
        isWinner={matchup.winner?.id === matchup.participant2?.id}
        position="bottom"
      />

      {canClick && (
        <motion.div
          className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-brand-hover"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: CONNECTOR.pulseLoop, repeat: Infinity }}
        />
      )}

      {/* Completion flash overlay */}
      {isRecentlyCompleted && (
        <motion.div
          initial={{ opacity: 0.7 }}
          animate={{ opacity: 0 }}
          transition={{ duration: CELEBRATION.flashDuration, ease: 'easeOut' }}
          className="absolute inset-0 rounded-card pointer-events-none z-10"
          style={{ background: 'radial-gradient(circle, rgba(34, 197, 94, 0.35) 0%, transparent 70%)' }}
        />
      )}
    </motion.div>
  );
}

function RoundHeader({ round, isCurrent }: { round: BracketRound; isCurrent: boolean }) {
  return (
    <div className="text-center mb-3">
      <h3 className={`text-sm font-bold font-grotesk ${isCurrent ? 'text-brand-hover' : 'text-slate-400'}`}>
        {round.name}
      </h3>
      <div className={`text-2xs mt-0.5 ${round.isComplete ? 'text-green-400' : 'text-slate-500'}`}>
        {round.isComplete ? 'Done' : `${round.matchups.filter(m => m.isComplete).length}/${round.matchups.length}`}
      </div>
    </div>
  );
}

function ChampionDisplay({ champion }: { champion: BracketParticipant }) {
  const title = champion.item?.title || champion.item?.name || 'Champion';

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ ...SPRING_CONFIG.champion, delay: ENTRANCE.third }}
      className="flex flex-col items-center justify-center p-3"
    >
      <motion.div
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: CONNECTOR.bounceLoop, repeat: Infinity }}
        className="relative mb-3"
      >
        <Trophy className={`w-12 h-12 text-yellow-400 ${GLOW_SHADOWS.champion.dropShadow}`} />
      </motion.div>

      <div className="text-sm font-bold font-grotesk text-yellow-400 uppercase tracking-wider mb-1.5">
        Champion
      </div>

      {champion.item?.image_url && (
        <div className="w-16 h-16 rounded-card overflow-hidden border-2 border-yellow-400/50 shadow-lg mb-2">
          <img src={champion.item.image_url} alt={title} className="w-full h-full object-cover" />
        </div>
      )}

      <div className="text-sm font-bold text-white text-center max-w-[140px]">{title}</div>
      <div className="mt-1 px-1.5 py-0.5 rounded bg-yellow-400/20 text-yellow-300 text-2xs">
        #{champion.seed}
      </div>
    </motion.div>
  );
}

function calculateMatchupY(
  matchIndex: number,
  matchupsInRound: number,
  bracketSize: number,
  matchupHeight: number,
  verticalGap: number
): number {
  const firstRoundMatchups = Math.ceil(bracketSize / 2);
  const totalHeight = firstRoundMatchups * (matchupHeight + verticalGap);
  const spacing = totalHeight / matchupsInRound;
  return matchIndex * spacing + spacing / 2 - matchupHeight / 2 + 50;
}

/**
 * Advancement orb that flows along an SVG connector path with particle trail
 */
function AdvancementOrb({
  anim,
  onComplete,
}: {
  anim: AdvancementAnim;
  onComplete: () => void;
}) {
  const PARTICLE_COUNT = 6;
  const endCx = anim.keyframesCx[anim.keyframesCx.length - 1];
  const endCy = anim.keyframesCy[anim.keyframesCy.length - 1];

  return (
    <g>
      {/* Outer glow */}
      <motion.circle
        r={18}
        fill="url(#advancementGlow)"
        initial={{ cx: anim.keyframesCx[0], cy: anim.keyframesCy[0], opacity: 0 }}
        animate={{
          cx: anim.keyframesCx,
          cy: anim.keyframesCy,
          opacity: [0, 0.6, 0.6, 0],
        }}
        transition={{ duration: CONNECTOR.orbDuration, ease: 'easeInOut', times: anim.times }}
      />

      {/* Main orb */}
      <motion.circle
        r={5}
        fill="url(#advancementOrb)"
        filter="url(#connector-glow)"
        initial={{ cx: anim.keyframesCx[0], cy: anim.keyframesCy[0], opacity: 0 }}
        animate={{
          cx: anim.keyframesCx,
          cy: anim.keyframesCy,
          opacity: [0, 1, 1, 0],
        }}
        transition={{ duration: CONNECTOR.orbDuration, ease: 'easeInOut', times: anim.times }}
        onAnimationComplete={onComplete}
      />

      {/* Particle trail */}
      {Array.from({ length: PARTICLE_COUNT }).map((_, i) => (
        <motion.circle
          key={`trail-${i}`}
          r={2.5 - i * 0.3}
          fill={COLORS.connectorActive}
          initial={{ cx: anim.keyframesCx[0], cy: anim.keyframesCy[0], opacity: 0 }}
          animate={{
            cx: anim.keyframesCx,
            cy: anim.keyframesCy,
            opacity: [0, 0.55 - i * 0.07, 0.55 - i * 0.07, 0],
          }}
          transition={{
            duration: CONNECTOR.orbDuration,
            delay: (i + 1) * STAGGER.particleTrail,
            ease: 'easeInOut',
            times: anim.times,
          }}
        />
      ))}

      {/* Arrival burst at endpoint */}
      {Array.from({ length: 5 }).map((_, i) => {
        const angle = (i / 5) * Math.PI * 2;
        const burstDist = 14;
        return (
          <motion.circle
            key={`burst-${i}`}
            r={2}
            fill={COLORS.connectorActive}
            initial={{ cx: endCx, cy: endCy, opacity: 0 }}
            animate={{
              cx: endCx + Math.cos(angle) * burstDist,
              cy: endCy + Math.sin(angle) * burstDist,
              opacity: [0, 0, 0.7, 0],
            }}
            transition={{
              duration: ENTRANCE_DURATION.slow,
              delay: CELEBRATION.burstDelay,
              ease: 'easeOut',
              times: [0, 0.1, 0.4, 1],
            }}
          />
        );
      })}
    </g>
  );
}

/**
 * Bracket tree visualization with cinematic connector animations
 */
export function BracketVisualization({
  bracket,
  onMatchupClick,
  selectedMatchupId,
}: BracketVisualizationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);

  const dims = useBracketDimensions();
  const { matchupWidth, matchupHeight, verticalGap, roundGap } = dims;

  // --- Advancement animation tracking ---
  const [advancements, setAdvancements] = useState<AdvancementAnim[]>([]);
  const [recentlyCompletedIds, setRecentlyCompletedIds] = useState<Set<string>>(new Set());
  const prevCompletionRef = useRef<Set<string>>(new Set());

  const { width, height, roundX } = useMemo(() => {
    const numRounds = bracket.rounds.length;
    const width = numRounds * (matchupWidth + roundGap) + 180;
    const firstRoundMatchups = bracket.rounds[0]?.matchups.length || Math.ceil(bracket.size / 2);
    const height = firstRoundMatchups * (matchupHeight + verticalGap) + 100;

    const roundX: number[] = [];
    for (let r = 0; r < numRounds; r++) {
      roundX.push(r * (matchupWidth + roundGap) + 16);
    }

    return { width, height, roundX };
  }, [bracket, matchupWidth, matchupHeight, verticalGap, roundGap]);

  // Determine which rounds are within or adjacent to the scroll viewport
  const visibleRoundIndices = useMemo(() => {
    if (!containerWidth) {
      // Before first measurement, render all rounds
      return new Set(bracket.rounds.map((_, i) => i));
    }
    const visible = new Set<number>();
    for (let r = 0; r < bracket.rounds.length; r++) {
      const roundLeft = roundX[r];
      const roundRight = roundLeft + matchupWidth;
      const viewLeft = scrollPosition;
      const viewRight = scrollPosition + containerWidth;
      // Include rounds that overlap the viewport or are 1 round adjacent (buffer)
      const buffer = matchupWidth + roundGap;
      if (roundRight >= viewLeft - buffer && roundLeft <= viewRight + buffer) {
        visible.add(r);
      }
    }
    return visible;
  }, [bracket.rounds.length, roundX, matchupWidth, roundGap, scrollPosition, containerWidth]);

  // Detect newly completed matchups and trigger advancement animations
  useEffect(() => {
    const currentCompleted = new Set<string>();
    for (const round of bracket.rounds) {
      for (const matchup of round.matchups) {
        if (matchup.isComplete) {
          currentCompleted.add(matchup.id);
        }
      }
    }

    const newlyCompleted: string[] = [];
    currentCompleted.forEach(id => {
      if (!prevCompletionRef.current.has(id)) {
        newlyCompleted.push(id);
      }
    });

    prevCompletionRef.current = currentCompleted;

    if (newlyCompleted.length === 0) return;

    // Mark matchup cards as recently completed (flash effect)
    setRecentlyCompletedIds(prev => {
      const next = new Set(prev);
      newlyCompleted.forEach(id => next.add(id));
      return next;
    });
    const flashIds = [...newlyCompleted];
    setTimeout(() => {
      setRecentlyCompletedIds(prev => {
        const next = new Set(prev);
        flashIds.forEach(id => next.delete(id));
        return next;
      });
    }, CELEBRATION.flashCleanupMs);

    // Generate advancement orb animations for matchups that have connectors
    const newAnims: AdvancementAnim[] = [];

    for (const matchupId of newlyCompleted) {
      for (let r = 0; r < bracket.rounds.length - 1; r++) {
        const matchup = bracket.rounds[r].matchups.find(m => m.id === matchupId);
        if (!matchup || !matchup.winner || !matchup.nextMatchupId) continue;

        const nextRound = bracket.rounds[r + 1];
        const nextMatchup = nextRound?.matchups.find(nm => nm.id === matchup.nextMatchupId);
        if (!nextMatchup) continue;

        const m = bracket.rounds[r].matchups.indexOf(matchup);
        const y1 = calculateMatchupY(m, bracket.rounds[r].matchups.length, bracket.size, matchupHeight, verticalGap) + matchupHeight / 2;
        const nextMatchupIndex = nextRound.matchups.indexOf(nextMatchup);
        const y2 = calculateMatchupY(nextMatchupIndex, nextRound.matchups.length, bracket.size, matchupHeight, verticalGap) + matchupHeight / 2 + (matchup.position === 'top' ? -matchupHeight / 4 : matchupHeight / 4);
        const x1 = roundX[r] + matchupWidth;
        const x2 = roundX[r + 1];
        const midX = (x1 + x2) / 2;

        // Compute proportional timing based on segment lengths
        const seg1 = Math.abs(midX - x1);
        const seg2 = Math.abs(y2 - y1);
        const seg3 = Math.abs(x2 - midX);
        const total = seg1 + seg2 + seg3;
        const times = total > 0
          ? [0, seg1 / total, (seg1 + seg2) / total, 1]
          : [0, 0.33, 0.67, 1];

        newAnims.push({
          id: `adv-${matchupId}-${Date.now()}`,
          matchupId,
          keyframesCx: [x1, midX, midX, x2],
          keyframesCy: [y1, y1, y2, y2],
          times,
        });
        break; // Found the matchup, stop searching rounds
      }
    }

    if (newAnims.length > 0) {
      setAdvancements(prev => [...prev, ...newAnims]);
    }
  }, [bracket, matchupHeight, verticalGap, roundX, matchupWidth]);

  // Remove a single advancement after its animation completes
  const handleAdvancementComplete = useCallback((animId: string) => {
    setAdvancements(prev => prev.filter(a => a.id !== animId));
  }, []);

  // Auto-scroll to selected matchup
  useEffect(() => {
    if (!selectedMatchupId || !containerRef.current) return;

    for (let r = 0; r < bracket.rounds.length; r++) {
      const matchupIndex = bracket.rounds[r].matchups.findIndex(m => m.id === selectedMatchupId);
      if (matchupIndex !== -1) {
        const x = roundX[r];
        const y = calculateMatchupY(matchupIndex, bracket.rounds[r].matchups.length, bracket.size, matchupHeight, verticalGap);
        const container = containerRef.current;

        container.scrollTo({
          left: Math.max(0, x - container.clientWidth / 2 + matchupWidth / 2),
          top: Math.max(0, y - container.clientHeight / 2 + matchupHeight / 2),
          behavior: 'smooth',
        });
        break;
      }
    }
  }, [selectedMatchupId, bracket, roundX, matchupHeight, verticalGap, matchupWidth]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const updateScroll = () => {
      setScrollPosition(container.scrollLeft);
      setContainerWidth(container.clientWidth);
    };
    updateScroll();
    container.addEventListener('scroll', updateScroll);
    window.addEventListener('resize', updateScroll);
    return () => {
      container.removeEventListener('scroll', updateScroll);
      window.removeEventListener('resize', updateScroll);
    };
  }, []);

  const canScrollLeft = scrollPosition > 0;
  const canScrollRight = containerRef.current
    ? scrollPosition < containerRef.current.scrollWidth - containerRef.current.clientWidth - 10
    : false;

  return (
    <div className="relative w-full">
      <AnimatePresence>
        {canScrollLeft && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => containerRef.current?.scrollBy({ left: -200, behavior: 'smooth' })}
            className="absolute left-1 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-slate-800/90 border border-slate-600 flex items-center justify-center hover:bg-slate-700"
          >
            <ChevronLeft className="w-4 h-4 text-slate-300" />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {canScrollRight && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => containerRef.current?.scrollBy({ left: 200, behavior: 'smooth' })}
            className="absolute right-1 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-slate-800/90 border border-slate-600 flex items-center justify-center hover:bg-slate-700"
          >
            <ChevronRight className="w-4 h-4 text-slate-300" />
          </motion.button>
        )}
      </AnimatePresence>

      <div
        ref={containerRef}
        className="overflow-x-auto overflow-y-auto pb-3 scrollbar-thin scrollbar-track-slate-800 scrollbar-thumb-slate-600"
      >
        <div className="relative" style={{ width, height, minWidth: width }}>
          {/* Connector lines SVG + advancement animations */}
          <svg className="absolute inset-0 pointer-events-none" width={width} height={height}>
            <defs>
              <filter id="connector-glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
              {/* Radial glow behind advancement orb */}
              <radialGradient id="advancementGlow">
                <stop offset="0%" stopColor="rgb(34, 211, 238)" stopOpacity="0.7" />
                <stop offset="50%" stopColor="rgb(34, 211, 238)" stopOpacity="0.25" />
                <stop offset="100%" stopColor="rgb(34, 211, 238)" stopOpacity="0" />
              </radialGradient>
              {/* Solid gradient for the orb itself */}
              <radialGradient id="advancementOrb">
                <stop offset="0%" stopColor="white" stopOpacity="1" />
                <stop offset="40%" stopColor="rgb(34, 211, 238)" stopOpacity="1" />
                <stop offset="100%" stopColor="rgb(6, 182, 212)" stopOpacity="0.9" />
              </radialGradient>
            </defs>

            {/* Connector paths — animated only for visible rounds, static for off-screen */}
            {bracket.rounds.slice(0, -1).map((round, r) => {
              const nextRound = bracket.rounds[r + 1];
              const isVisible = visibleRoundIndices.has(r) || visibleRoundIndices.has(r + 1);
              return round.matchups.map((matchup, m) => {
                if (!matchup.nextMatchupId) return null;
                const nextMatchup = nextRound.matchups.find(nm => nm.id === matchup.nextMatchupId);
                if (!nextMatchup) return null;

                const y1 = calculateMatchupY(m, round.matchups.length, bracket.size, matchupHeight, verticalGap) + matchupHeight / 2;
                const nextMatchupIndex = nextRound.matchups.indexOf(nextMatchup);
                const y2 = calculateMatchupY(nextMatchupIndex, nextRound.matchups.length, bracket.size, matchupHeight, verticalGap) + matchupHeight / 2 + (matchup.position === 'top' ? -matchupHeight / 4 : matchupHeight / 4);
                const x1 = roundX[r] + matchupWidth;
                const x2 = roundX[r + 1];
                const midX = (x1 + x2) / 2;

                const hasAdvanced = matchup.winner && (nextMatchup.participant1?.id === matchup.winner.id || nextMatchup.participant2?.id === matchup.winner?.id);
                const connectorState: ConnectorState = hasAdvanced
                  ? nextMatchup.isComplete ? 'active' : 'pending'
                  : 'default';

                const pathD = `M ${x1} ${y1} H ${midX} V ${y2} H ${x2}`;

                // Off-screen connectors: render static paths (no Framer Motion overhead)
                if (!isVisible) {
                  const stroke = connectorState === 'active' ? COLORS.connectorActive
                    : connectorState === 'pending' ? COLORS.connectorPending
                    : COLORS.connector;
                  const sw = connectorState === 'active' ? 2 : connectorState === 'pending' ? 1.5 : 1;
                  return (
                    <path
                      key={`c-${matchup.id}`}
                      d={pathD}
                      fill="none"
                      stroke={stroke}
                      strokeWidth={sw}
                    />
                  );
                }

                if (connectorState === 'active') {
                  return (
                    <motion.path
                      key={`c-${matchup.id}`}
                      d={pathD}
                      fill="none"
                      stroke={COLORS.connectorActive}
                      strokeWidth={2}
                      filter="url(#connector-glow)"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: CONNECTOR.drawDuration, delay: r * STAGGER.bracketRound }}
                    />
                  );
                }

                if (connectorState === 'pending') {
                  return (
                    <g key={`c-${matchup.id}`}>
                      <motion.path
                        d={pathD}
                        fill="none"
                        stroke={COLORS.connectorPending}
                        strokeWidth={1.5}
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: CONNECTOR.drawDuration, delay: r * STAGGER.bracketRound }}
                      />
                      <motion.path
                        d={pathD}
                        fill="none"
                        stroke={COLORS.connectorActive}
                        strokeWidth={1.5}
                        strokeDasharray="6 4"
                        initial={{ strokeDashoffset: 0 }}
                        animate={{ strokeDashoffset: -20 }}
                        transition={{ duration: CONNECTOR.dashLoop, repeat: Infinity, ease: 'linear' }}
                      />
                    </g>
                  );
                }

                return (
                  <motion.path
                    key={`c-${matchup.id}`}
                    d={pathD}
                    fill="none"
                    stroke={COLORS.connector}
                    strokeWidth={1}
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: CONNECTOR.drawDuration, delay: r * STAGGER.bracketRound }}
                  />
                );
              });
            })}

            {/* Advancement orb animations */}
            <AnimatePresence>
              {advancements.map((anim) => (
                <AdvancementOrb
                  key={anim.id}
                  anim={anim}
                  onComplete={() => handleAdvancementComplete(anim.id)}
                />
              ))}
            </AnimatePresence>
          </svg>

          {/* Rounds — only render matchup cards for visible/adjacent rounds */}
          {bracket.rounds.map((round, roundIndex) => {
            const isVisible = visibleRoundIndices.has(roundIndex);
            return (
              <div key={round.index} className="absolute top-0" style={{ left: roundX[roundIndex] }}>
                <RoundHeader round={round} isCurrent={roundIndex === bracket.currentRoundIndex} />
                {isVisible && (
                  <div className="relative">
                    {round.matchups.map((matchup, matchupIndex) => {
                      const y = calculateMatchupY(matchupIndex, round.matchups.length, bracket.size, matchupHeight, verticalGap);
                      const isPlayable = roundIndex === bracket.currentRoundIndex &&
                        matchup.participant1 && matchup.participant2 &&
                        !matchup.participant1.isBye && !matchup.participant2.isBye;

                      return (
                        <div key={matchup.id} className="absolute" style={{ top: y - 50 }}>
                          <MatchupCard
                            matchup={matchup}
                            onClick={() => onMatchupClick(matchup)}
                            isSelected={selectedMatchupId === matchup.id}
                            isPlayable={!!isPlayable}
                            width={matchupWidth}
                            isRecentlyCompleted={recentlyCompletedIds.has(matchup.id)}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {bracket.isComplete && bracket.champion && (
            <div
              className="absolute"
              style={{ left: roundX[roundX.length - 1] + matchupWidth + roundGap, top: height / 2 - 80 }}
            >
              <ChampionDisplay champion={bracket.champion} />
            </div>
          )}
        </div>
      </div>

      {/* Gradient edges */}
      <div
        className="absolute top-0 left-0 w-12 h-full pointer-events-none"
        style={{
          background: 'linear-gradient(to right, rgba(15,23,42,0.9) 0%, transparent 100%)',
          opacity: canScrollLeft ? 1 : 0,
          transition: 'opacity 0.2s',
        }}
      />
      <div
        className="absolute top-0 right-0 w-12 h-full pointer-events-none"
        style={{
          background: 'linear-gradient(to left, rgba(15,23,42,0.9) 0%, transparent 100%)',
          opacity: canScrollRight ? 1 : 0,
          transition: 'opacity 0.2s',
        }}
      />
    </div>
  );
}
