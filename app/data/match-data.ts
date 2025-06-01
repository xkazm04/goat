import { BacklogGroupType, GridItemType } from "@/app/types/match";

// Create 50 grid items
export const mockGridItems: GridItemType[] = Array.from({ length: 15 }).map((_, i) => ({
  id: `grid-${i + 1}`,
  title: `Feature ${i + 1}: ${getRandomFeature()}`,
  tags: getRandomTags(),
  matched: i < 5, // Make the first 5 already matched
  ...(i < 5 && { matchedWith: `User Story ${getRandomInt(1, 20)}` }),
}));

// Create 10 backlog groups with 5-10 items each
export const mockBacklogGroups: BacklogGroupType[] = Array.from({ length: 10 }).map((_, i) => ({
  id: `group-${i + 1}`,
  title: `Sprint ${i + 1}: ${getRandomSprintName()}`,
  isOpen: i < 3, // First 3 groups are open by default
  items: Array.from({ length: getRandomInt(5, 10) }).map((_, j) => {
    const itemIndex = i * 10 + j + 1;
    return {
      id: `backlog-${itemIndex}`,
      title: `User Story ${itemIndex}: ${getRandomUserStory()}`,
      description: getRandomDescription(),
      tags: getRandomTags(),
      matched: itemIndex % 8 === 0, // Some items are already matched
      ...(itemIndex % 8 === 0 && { matchedWith: `Feature ${getRandomInt(1, 15)}` }),
    };
  }),
}));

// Helper functions for generating random data
function getRandomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomTags(): string[] {
  const tags = [
    "UX", "UI", "Backend", "Frontend", "API", "Auth", "Database", "Performance",
    "Security", "Accessibility", "Mobile", "Desktop", "Testing", "DevOps",
    "Analytics", "SEO", "Payments", "Social", "Notifications", "Reporting"
  ];
  
  const count = getRandomInt(1, 3);
  const result: string[] = [];
  
  for (let i = 0; i < count; i++) {
    const tag = getRandomElement(tags);
    if (!result.includes(tag)) {
      result.push(tag);
    }
  }
  
  return result;
}

function getRandomFeature(): string {
  const features = [
    "User Authentication",
    "Dashboard Redesign",
    "Payment Integration",
    "Search Optimization",
    "Notification System",
    "Analytics Dashboard",
    "Mobile Responsiveness",
    "User Onboarding",
    "Performance Improvements",
    "Security Enhancements",
    "API Integration",
    "Export Functionality",
    "Social Sharing",
    "Feedback System",
    "Dark Mode Support",
    "Multi-language Support",
    "Accessibility Improvements",
    "Subscription Management",
    "Content Filtering",
    "Real-time Updates"
  ];
  
  return getRandomElement(features);
}

function getRandomSprintName(): string {
  const adjectives = [
    "Agile", "Swift", "Dynamic", "Rapid", "Focused", "Innovative",
    "Strategic", "Efficient", "Productive", "Collaborative"
  ];
  
  const nouns = [
    "Delivery", "Development", "Implementation", "Execution", "Integration",
    "Deployment", "Iteration", "Release", "Milestone", "Breakthrough"
  ];
  
  return `${getRandomElement(adjectives)} ${getRandomElement(nouns)}`;
}

function getRandomUserStory(): string {
  const users = [
    "Administrator", "Customer", "Manager", "Guest User", "Content Creator",
    "Subscriber", "Developer", "Analyst", "Support Agent", "Moderator"
  ];
  
  const actions = [
    "view", "create", "edit", "delete", "manage", "track", "export", "import",
    "filter", "sort", "share", "assign", "approve", "reject", "analyze"
  ];
  
  const objects = [
    "dashboard", "profile", "settings", "reports", "notifications", "messages",
    "accounts", "transactions", "content", "permissions", "statistics", "feedback"
  ];
  
  const benefits = [
    "more efficiently", "with better insights", "with fewer clicks",
    "across all devices", "in real-time", "without delays", "with better security",
    "with team members", "in different formats", "with detailed history"
  ];
  
  return `As a ${getRandomElement(users)}, I want to ${getRandomElement(actions)} ${getRandomElement(objects)} ${getRandomElement(benefits)}`;
}

function getRandomDescription(): string {
  const descriptions = [
    "This requires integration with the existing API endpoints and authentication flow.",
    "The design team has provided mockups in Figma for the UI implementation.",
    "We need to ensure this feature works across all supported browsers and devices.",
    "Performance is critical for this feature, aim for <200ms response time.",
    "This involves migrating data from the legacy system to the new architecture.",
    "Security considerations include proper input validation and CSRF protection.",
    "This should be implemented with accessibility (WCAG AA) compliance in mind.",
    "Analytics tracking should be added to measure user engagement with this feature.",
    "This is a high priority item for the upcoming release, deadline is tight.",
    "Technical debt from the previous implementation needs to be addressed here."
  ];
  
  return getRandomElement(descriptions);
}