'use client';

/**
 * ShareChainViz Component
 * Visualizes the viral share chain
 */

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { ShareChain, ShareChainNode } from '@/lib/challenges/ShareChainTracker';

interface ShareChainVizProps {
  chain: ShareChain;
  currentUserId?: string;
  compact?: boolean;
}

/**
 * Get color based on depth
 */
function getDepthColor(depth: number): string {
  const colors = [
    'bg-emerald-500',
    'bg-blue-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-amber-500',
    'bg-red-500',
  ];
  return colors[depth % colors.length];
}

/**
 * Node component
 */
function ChainNode({
  node,
  isCurrentUser,
  compact,
  index,
}: {
  node: ShareChainNode;
  isCurrentUser: boolean;
  compact: boolean;
  index: number;
}) {
  const depthColor = getDepthColor(node.depth);

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: index * 0.1 }}
        className={`relative w-8 h-8 rounded-full ${depthColor} flex items-center justify-center ${
          isCurrentUser ? 'ring-2 ring-white ring-offset-2 ring-offset-zinc-900' : ''
        }`}
        title={`${node.displayName}${node.completed ? ' (completed)' : ''}`}
      >
        {node.avatarUrl ? (
          <img
            src={node.avatarUrl}
            alt={node.displayName}
            className="w-full h-full rounded-full object-cover"
          />
        ) : (
          <span className="text-xs font-bold text-white">
            {node.displayName.charAt(0).toUpperCase()}
          </span>
        )}
        {node.completed && (
          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center">
            <svg
              className="w-2.5 h-2.5 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className={`flex items-center gap-3 p-3 rounded-lg bg-zinc-900 border ${
        isCurrentUser ? 'border-emerald-500/50' : 'border-zinc-800'
      }`}
    >
      {/* Avatar */}
      <div
        className={`relative w-10 h-10 rounded-full ${depthColor} flex items-center justify-center`}
      >
        {node.avatarUrl ? (
          <img
            src={node.avatarUrl}
            alt={node.displayName}
            className="w-full h-full rounded-full object-cover"
          />
        ) : (
          <span className="text-sm font-bold text-white">
            {node.displayName.charAt(0).toUpperCase()}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-white truncate">{node.displayName}</span>
          {isCurrentUser && (
            <span className="px-1.5 py-0.5 text-xs bg-emerald-500/20 text-emerald-400 rounded">
              You
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          {node.depth === 0 ? (
            <span>Started the chain</span>
          ) : (
            <span>Level {node.depth}</span>
          )}
          {node.referralCount > 0 && (
            <>
              <span>·</span>
              <span>{node.referralCount} referred</span>
            </>
          )}
          {node.completed && node.score !== undefined && (
            <>
              <span>·</span>
              <span className="text-emerald-400">Score: {node.score}</span>
            </>
          )}
        </div>
      </div>

      {/* Status */}
      <div className="flex items-center">
        {node.completed ? (
          <div className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-medium rounded">
            Completed
          </div>
        ) : (
          <div className="px-2 py-1 bg-amber-500/20 text-amber-400 text-xs font-medium rounded">
            In Progress
          </div>
        )}
      </div>
    </motion.div>
  );
}

export function ShareChainViz({ chain, currentUserId, compact = false }: ShareChainVizProps) {
  // Group nodes by depth
  const nodesByDepth = useMemo(() => {
    const groups: Map<number, ShareChainNode[]> = new Map();
    chain.nodes.forEach((node) => {
      const existing = groups.get(node.depth) || [];
      groups.set(node.depth, [...existing, node]);
    });
    return groups;
  }, [chain.nodes]);

  const maxDepth = Math.max(...chain.nodes.map((n) => n.depth));

  if (compact) {
    return (
      <div className="space-y-3">
        {/* Summary */}
        <div className="text-sm text-zinc-400">
          {chain.nodes.length} participants · {chain.totalCompletions} completed
        </div>

        {/* Chain visualization */}
        <div className="flex flex-wrap gap-1">
          {chain.nodes.map((node, index) => (
            <ChainNode
              key={node.userId}
              node={node}
              isCurrentUser={node.userId === currentUserId}
              compact
              index={index}
            />
          ))}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-xs text-zinc-500">
          <div className="flex items-center gap-1">
            <span className="text-zinc-400">{chain.stats.viralCoefficient.toFixed(1)}</span>
            viral coefficient
          </div>
          <div className="flex items-center gap-1">
            <span className="text-zinc-400">{Math.round(chain.stats.completionRate)}%</span>
            completion rate
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Share Chain</h3>
          <p className="text-sm text-zinc-400 mt-1">
            {chain.totalParticipants} participants across {maxDepth + 1} levels
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-white">
              {chain.stats.viralCoefficient.toFixed(1)}
            </div>
            <div className="text-xs text-zinc-500">Viral Coefficient</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-emerald-400">
              {Math.round(chain.stats.completionRate)}%
            </div>
            <div className="text-xs text-zinc-500">Completion Rate</div>
          </div>
        </div>
      </div>

      {/* Chain by depth */}
      <div className="space-y-4">
        {Array.from(nodesByDepth.entries())
          .sort((a, b) => a[0] - b[0])
          .map(([depth, nodes]) => (
            <div key={depth}>
              {/* Depth label */}
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-3 h-3 rounded-full ${getDepthColor(depth)}`} />
                <span className="text-sm font-medium text-zinc-400">
                  {depth === 0 ? 'Originator' : `Level ${depth}`}
                </span>
                <span className="text-xs text-zinc-600">({nodes.length})</span>
              </div>

              {/* Nodes */}
              <div className="space-y-2 pl-5 border-l border-zinc-800">
                {nodes.map((node, index) => (
                  <ChainNode
                    key={node.userId}
                    node={node}
                    isCurrentUser={node.userId === currentUserId}
                    compact={false}
                    index={index}
                  />
                ))}
              </div>
            </div>
          ))}
      </div>

      {/* Top referrer */}
      {chain.stats.topReferrer && (
        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-lg">
          <div className="text-sm text-zinc-400 mb-2">Top Referrer</div>
          <div className="flex items-center justify-between">
            <span className="font-medium text-white">{chain.stats.topReferrer.displayName}</span>
            <span className="text-emerald-400">
              {chain.stats.topReferrer.referralCount} referrals
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
