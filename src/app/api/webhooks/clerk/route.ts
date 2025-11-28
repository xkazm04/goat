import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent, UserJSON } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Sync user profile from Clerk to Supabase
async function syncUserProfile(userData: UserJSON) {
  try {
    const supabase = await createClient();

    const displayName = userData.first_name && userData.last_name
      ? `${userData.first_name} ${userData.last_name}`.trim()
      : userData.username || userData.email_addresses?.[0]?.email_address?.split('@')[0] || 'Anonymous';

    const avatarUrl = userData.image_url || null;
    const email = userData.email_addresses?.[0]?.email_address || null;

    const { error } = await supabase
      .from('user_profiles')
      .upsert({
        clerk_id: userData.id,
        display_name: displayName,
        email: email,
        avatar_url: avatarUrl,
        is_premium: false,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'clerk_id',
      });

    if (error) {
      console.error('Error syncing user profile:', error);
      throw error;
    }

    console.log(`✅ User profile synced for ${userData.id}`);
  } catch (err) {
    console.error('Failed to sync user profile:', err);
    throw err;
  }
}

// Delete user profile from Supabase
async function deleteUserProfile(clerkId: string) {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('user_profiles')
      .delete()
      .eq('clerk_id', clerkId);

    if (error) {
      console.error('Error deleting user profile:', error);
      throw error;
    }

    console.log(`✅ User profile deleted for ${clerkId}`);
  } catch (err) {
    console.error('Failed to delete user profile:', err);
    throw err;
  }
}

export async function POST(req: NextRequest) {
  // You can find this in the Clerk Dashboard -> Webhooks -> choose the webhook
  const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error('Please add WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local');
  }

  // Get the headers (await for Next.js 15+)
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error occured -- no svix headers', {
      status: 400
    });
  }

  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Create a new Svix instance with your secret.
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return new Response('Error occured', {
      status: 400
    });
  }

  // Handle the webhook
  const { id } = evt.data;
  const eventType = evt.type;

  console.log(`Webhook with an ID of ${id} and type of ${eventType}`);

  // Handle different event types
  try {
    switch (eventType) {
      case 'user.created':
        console.log('User created:', id);
        await syncUserProfile(evt.data as UserJSON);
        break;

      case 'user.updated':
        console.log('User updated:', id);
        await syncUserProfile(evt.data as UserJSON);
        break;

      case 'user.deleted':
        console.log('User deleted:', id);
        if (id) {
          await deleteUserProfile(id);
        }
        break;

      case 'session.created':
        // Handle session creation - optionally sync user profile
        console.log('Session created:', id);
        break;

      default:
        console.log(`Unhandled webhook event type: ${eventType}`);
    }
  } catch (err) {
    console.error('Error handling webhook:', err);
    // Return 200 anyway to prevent retries for non-critical errors
  }

  return NextResponse.json({ received: true });
}