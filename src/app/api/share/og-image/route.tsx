import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

// OG Image dimensions
const WIDTH = 1200;
const HEIGHT = 630;

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function getSharedRanking(code: string) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data, error } = await supabase
    .from('shared_rankings')
    .select('*')
    .eq('share_code', code)
    .single();

  if (error) {
    console.error('Error fetching shared ranking:', error);
    return null;
  }

  return data;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');

    if (!code) {
      return new Response('Share code is required', { status: 400 });
    }

    // Fetch the shared ranking data
    const ranking = await getSharedRanking(code);

    if (!ranking) {
      // Return a default OG image if ranking not found
      return new ImageResponse(
        (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(135deg, #0f1423 0%, #1a1f35 50%, #0f1423 100%)',
              fontFamily: 'Inter, system-ui, sans-serif',
            }}
          >
            <div
              style={{
                fontSize: 64,
                fontWeight: 'bold',
                color: '#22d3ee',
                marginBottom: 20,
              }}
            >
              G.O.A.T.
            </div>
            <div
              style={{
                fontSize: 32,
                color: '#94a3b8',
              }}
            >
              Ranking not found
            </div>
          </div>
        ),
        {
          width: WIDTH,
          height: HEIGHT,
        }
      );
    }

    const { title, category, subcategory, time_period, items = [] } = ranking;
    const topItems = items.slice(0, 5);
    const itemCount = items.length;
    const timePeriodText = time_period || 'All Time';

    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            background: 'linear-gradient(135deg, #0f1423 0%, #1a1f35 50%, #0f1423 100%)',
            fontFamily: 'Inter, system-ui, sans-serif',
            padding: 48,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Decorative gradient circles */}
          <div
            style={{
              position: 'absolute',
              top: -100,
              right: -100,
              width: 400,
              height: 400,
              background: 'radial-gradient(circle, rgba(6, 182, 212, 0.15) 0%, transparent 70%)',
              borderRadius: '50%',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: -150,
              left: -150,
              width: 500,
              height: 500,
              background: 'radial-gradient(circle, rgba(139, 92, 246, 0.1) 0%, transparent 70%)',
              borderRadius: '50%',
            }}
          />

          {/* Header section */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: 32,
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {/* Category badge */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 16,
                }}
              >
                <div
                  style={{
                    background: 'rgba(6, 182, 212, 0.2)',
                    border: '1px solid rgba(6, 182, 212, 0.3)',
                    borderRadius: 8,
                    padding: '6px 16px',
                    color: '#22d3ee',
                    fontSize: 18,
                    fontWeight: 500,
                  }}
                >
                  {category}
                  {subcategory && ` • ${subcategory}`}
                </div>
                <div
                  style={{
                    background: 'rgba(139, 92, 246, 0.2)',
                    border: '1px solid rgba(139, 92, 246, 0.3)',
                    borderRadius: 8,
                    padding: '6px 16px',
                    color: '#a78bfa',
                    fontSize: 18,
                    fontWeight: 500,
                  }}
                >
                  {timePeriodText}
                </div>
              </div>

              {/* Title */}
              <div
                style={{
                  fontSize: 48,
                  fontWeight: 700,
                  color: 'white',
                  lineHeight: 1.2,
                  maxWidth: 700,
                }}
              >
                {title}
              </div>
            </div>

            {/* GOAT branding */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
              }}
            >
              <div
                style={{
                  fontSize: 36,
                  fontWeight: 800,
                  background: 'linear-gradient(135deg, #22d3ee 0%, #a78bfa 100%)',
                  backgroundClip: 'text',
                  color: 'transparent',
                }}
              >
                G.O.A.T.
              </div>
              <div
                style={{
                  fontSize: 14,
                  color: '#64748b',
                  marginTop: 4,
                }}
              >
                Greatest Of All Time
              </div>
            </div>
          </div>

          {/* Rankings list */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              flex: 1,
            }}
          >
            {topItems.map((item: { position: number; title: string; image_url?: string }, index: number) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 20,
                  background: index === 0
                    ? 'linear-gradient(135deg, rgba(250, 204, 21, 0.15) 0%, rgba(250, 204, 21, 0.05) 100%)'
                    : index === 1
                    ? 'linear-gradient(135deg, rgba(226, 232, 240, 0.1) 0%, rgba(226, 232, 240, 0.03) 100%)'
                    : index === 2
                    ? 'linear-gradient(135deg, rgba(180, 83, 9, 0.15) 0%, rgba(180, 83, 9, 0.05) 100%)'
                    : 'rgba(255, 255, 255, 0.03)',
                  borderRadius: 16,
                  padding: '16px 24px',
                  border: index < 3
                    ? `1px solid ${index === 0 ? 'rgba(250, 204, 21, 0.3)' : index === 1 ? 'rgba(226, 232, 240, 0.2)' : 'rgba(180, 83, 9, 0.3)'}`
                    : '1px solid rgba(255, 255, 255, 0.05)',
                }}
              >
                {/* Position number */}
                <div
                  style={{
                    fontSize: 32,
                    fontWeight: 700,
                    color: index === 0 ? '#facc15' : index === 1 ? '#e2e8f0' : index === 2 ? '#b45309' : '#64748b',
                    width: 48,
                    textAlign: 'center',
                  }}
                >
                  {item.position}
                </div>

                {/* Item image (if available) */}
                {item.image_url && (
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 12,
                      background: 'rgba(255, 255, 255, 0.1)',
                      overflow: 'hidden',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.image_url}
                      alt=""
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                  </div>
                )}

                {/* Item title */}
                <div
                  style={{
                    fontSize: 24,
                    fontWeight: index < 3 ? 600 : 500,
                    color: index < 3 ? 'white' : '#cbd5e1',
                    flex: 1,
                  }}
                >
                  {item.title}
                </div>
              </div>
            ))}

            {/* More items indicator */}
            {itemCount > 5 && (
              <div
                style={{
                  fontSize: 18,
                  color: '#64748b',
                  textAlign: 'center',
                  marginTop: 8,
                }}
              >
                +{itemCount - 5} more items
              </div>
            )}
          </div>

          {/* Footer with CTA */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: 24,
              paddingTop: 24,
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <div
                style={{
                  fontSize: 18,
                  color: '#64748b',
                }}
              >
                Think you can do better?
              </div>
              <div
                style={{
                  background: 'linear-gradient(135deg, #06b6d4 0%, #8b5cf6 100%)',
                  borderRadius: 8,
                  padding: '8px 20px',
                  color: 'white',
                  fontSize: 18,
                  fontWeight: 600,
                }}
              >
                Challenge this ranking
              </div>
            </div>

            <div
              style={{
                fontSize: 16,
                color: '#64748b',
              }}
            >
              goat.app
            </div>
          </div>
        </div>
      ),
      {
        width: WIDTH,
        height: HEIGHT,
      }
    );
  } catch (error) {
    console.error('Error generating OG image:', error);
    return new Response('Error generating image', { status: 500 });
  }
}
