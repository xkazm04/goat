export const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case 'sports':
        return { primary: '#f59e0b', secondary: '#d97706', accent: '#fbbf24' };
      case 'music':
        return { primary: '#ef4444', secondary: '#dc2626', accent: '#f87171' };
      case 'games':
        return { primary: '#8b5cf6', secondary: '#7c3aed', accent: '#a78bfa' };
      default:
        return { primary: '#6b7280', secondary: '#4b5563', accent: '#9ca3af' };
    }
  };