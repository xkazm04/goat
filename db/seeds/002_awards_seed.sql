-- Seed data for Awards feature

-- 1. Create the parent "Game Awards 2025" list
INSERT INTO lists (id, title, category, description, size, type, user_id, created_at, updated_at)
VALUES (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'Game Awards 2025',
  'games',
  'Vote for your favorites in the 2025 Game Awards!',
  10, -- Not strictly used for parent, but good to have
  'award',
  '00000000-0000-0000-0000-000000000000', -- System user or placeholder
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET 
  description = EXCLUDED.description,
  type = EXCLUDED.type;

-- 2. Create Award Categories (Child Lists)

-- Best Narrative
INSERT INTO lists (id, title, category, description, size, type, parent_list_id, user_id, created_at, updated_at)
VALUES (
  'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b22',
  'Best Narrative',
  'games',
  'Recognizing outstanding storytelling and narrative development.',
  1, -- Single winner
  'award',
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', -- Parent: Game Awards 2025
  '00000000-0000-0000-0000-000000000000',
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET 
  description = EXCLUDED.description,
  type = EXCLUDED.type,
  parent_list_id = EXCLUDED.parent_list_id;

-- Best Art Direction
INSERT INTO lists (id, title, category, description, size, type, parent_list_id, user_id, created_at, updated_at)
VALUES (
  'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380c33',
  'Best Art Direction',
  'games',
  'For outstanding creative and technical achievement in artistic design and animation.',
  1,
  'award',
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  '00000000-0000-0000-0000-000000000000',
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET 
  description = EXCLUDED.description,
  type = EXCLUDED.type,
  parent_list_id = EXCLUDED.parent_list_id;

-- Best Score and Music
INSERT INTO lists (id, title, category, description, size, type, parent_list_id, user_id, created_at, updated_at)
VALUES (
  'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380d44',
  'Best Score and Music',
  'games',
  'For outstanding music, inclusive of score, original song and/or licensed soundtrack.',
  1,
  'award',
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  '00000000-0000-0000-0000-000000000000',
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET 
  description = EXCLUDED.description,
  type = EXCLUDED.type,
  parent_list_id = EXCLUDED.parent_list_id;

-- Best Performance
INSERT INTO lists (id, title, category, description, size, type, parent_list_id, user_id, created_at, updated_at)
VALUES (
  'e4eebc99-9c0b-4ef8-bb6d-6bb9bd380e55',
  'Best Performance',
  'games',
  'Awarded to an individual for voice-over acting, motion and/or performance capture.',
  1,
  'award',
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  '00000000-0000-0000-0000-000000000000',
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET 
  description = EXCLUDED.description,
  type = EXCLUDED.type,
  parent_list_id = EXCLUDED.parent_list_id;

-- Game of the Year
INSERT INTO lists (id, title, category, description, size, type, parent_list_id, user_id, created_at, updated_at)
VALUES (
  'f5eebc99-9c0b-4ef8-bb6d-6bb9bd380f66',
  'Game of the Year',
  'games',
  'Recognizing a game that delivers the absolute best experience across all creative and technical fields.',
  1,
  'award',
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  '00000000-0000-0000-0000-000000000000',
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET 
  description = EXCLUDED.description,
  type = EXCLUDED.type,
  parent_list_id = EXCLUDED.parent_list_id;
