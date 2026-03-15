/** Medal/rank styling for top positions */
export function getRankStyle(rank: number): { bg: string; text: string; border: string } {
  switch (rank) {
    case 1:
      return { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/40' };
    case 2:
      return { bg: 'bg-slate-300/20', text: 'text-slate-300', border: 'border-slate-400/40' };
    case 3:
      return { bg: 'bg-amber-600/20', text: 'text-amber-500', border: 'border-amber-600/40' };
    default:
      return { bg: 'bg-slate-800/50', text: 'text-slate-400', border: 'border-slate-700/50' };
  }
}
