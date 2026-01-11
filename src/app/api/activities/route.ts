import { NextRequest, NextResponse } from 'next/server';

// In-memory activity store (in production, this would be a database)
// This simulates a simple activity log
interface ActivityRecord {
  id: string;
  username: string;
  listTitle: string;
  category: string;
  subcategory?: string;
  itemCount: number;
  timestamp: string;
}

// Demo activities for initial state
const demoActivities: ActivityRecord[] = [
  {
    id: 'demo-1',
    username: 'QuickRanker42',
    listTitle: 'Top 10 NBA Players',
    category: 'sports',
    subcategory: 'basketball',
    itemCount: 10,
    timestamp: new Date(Date.now() - 30000).toISOString(),
  },
  {
    id: 'demo-2',
    username: 'MovieBuff99',
    listTitle: 'Best Movies of 2024',
    category: 'entertainment',
    subcategory: 'movies',
    itemCount: 10,
    timestamp: new Date(Date.now() - 60000).toISOString(),
  },
  {
    id: 'demo-3',
    username: 'MusicPro77',
    listTitle: 'Greatest Albums Ever',
    category: 'music',
    subcategory: 'albums',
    itemCount: 25,
    timestamp: new Date(Date.now() - 120000).toISOString(),
  },
];

let activities: ActivityRecord[] = [...demoActivities];

// Generate a random username for anonymous users
const generateUsername = (): string => {
  const adjectives = ['Swift', 'Bold', 'Epic', 'Clever', 'Mighty', 'Quick', 'Sharp', 'Cool'];
  const nouns = ['Ranker', 'Voter', 'Picker', 'Curator', 'Judge', 'Expert', 'Master', 'Pro'];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 100);
  return `${adj}${noun}${num}`;
};

// GET: Fetch recent activities
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const since = searchParams.get('since');

    let filteredActivities = [...activities];

    // Filter by timestamp if 'since' is provided
    if (since) {
      const sinceDate = new Date(since);
      filteredActivities = filteredActivities.filter(
        (a) => new Date(a.timestamp) > sinceDate
      );
    }

    // Sort by timestamp descending (newest first)
    filteredActivities.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // Limit results
    filteredActivities = filteredActivities.slice(0, limit);

    return NextResponse.json({
      activities: filteredActivities,
      total: activities.length,
    });
  } catch (error) {
    console.error('Error fetching activities:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activities' },
      { status: 500 }
    );
  }
}

// POST: Record a new activity
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { listTitle, category, subcategory, itemCount, username } = body;

    if (!listTitle || !category) {
      return NextResponse.json(
        { error: 'Missing required fields: listTitle and category' },
        { status: 400 }
      );
    }

    const newActivity: ActivityRecord = {
      id: `activity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      username: username || generateUsername(),
      listTitle,
      category,
      subcategory,
      itemCount: itemCount || 10,
      timestamp: new Date().toISOString(),
    };

    // Add to beginning of array
    activities.unshift(newActivity);

    // Keep only last 100 activities in memory
    if (activities.length > 100) {
      activities = activities.slice(0, 100);
    }

    return NextResponse.json({
      success: true,
      activity: newActivity,
    });
  } catch (error) {
    console.error('Error recording activity:', error);
    return NextResponse.json(
      { error: 'Failed to record activity' },
      { status: 500 }
    );
  }
}
