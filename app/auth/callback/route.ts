import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  const baseUrl =
    process.env.APP_URL && !process.env.APP_URL.includes('MY_APP_URL')
      ? process.env.APP_URL.replace(/\/$/, '')
      : new URL(req.url).origin;

  const redirectUri = `${baseUrl}/auth/callback`;
  const clientId = process.env.SPOTIFY_CLIENT_ID || '';
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET || '';

  let payload: Record<string, unknown> = {
    type: 'OAUTH_AUTH_SUCCESS',
    provider: 'spotify',
    status: error ? 'error' : 'connected',
    error: error || null,
    tracks: [],
    profileName: 'Spotify Listener',
  };

  if (code && clientId && clientSecret) {
    try {
      const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
        }),
      });

      if (tokenRes.ok) {
        const tokenData = (await tokenRes.json()) as { access_token: string };
        const accessToken = tokenData.access_token;

        const [profileRes, topRes] = await Promise.all([
          fetch('https://api.spotify.com/v1/me', {
            headers: { Authorization: `Bearer ${accessToken}` },
          }),
          fetch('https://api.spotify.com/v1/me/top/tracks?limit=20&time_range=medium_term', {
            headers: { Authorization: `Bearer ${accessToken}` },
          }),
        ]);

        let profileName = 'Spotify Listener';
        if (profileRes.ok) {
          const p = (await profileRes.json()) as { display_name?: string };
          if (p.display_name) profileName = p.display_name;
        }

        const tracks: unknown[] = [];
        if (topRes.ok) {
          const topData = (await topRes.json()) as {
            items?: Array<{
              id: string;
              name: string;
              preview_url?: string | null;
              external_urls?: { spotify?: string };
              artists?: Array<{ name: string }>;
              album?: {
                name?: string;
                release_date?: string;
                images?: Array<{ url: string }>;
              };
            }>;
          };

          for (const item of topData.items || []) {
            const year = item.album?.release_date
              ? Number(item.album.release_date.slice(0, 4)) || 2020
              : 2020;
            const artist = item.artists?.[0]?.name || 'Unknown Artist';
            const query = encodeURIComponent(`${item.name} ${artist}`);
            tracks.push({
              id: `spotify-${item.id}`,
              title: item.name,
              artist,
              album: item.album?.name || item.name,
              releaseYear: year,
              decade: `${Math.floor(year / 10) * 10}s`,
              genre: 'Personal Top Mix',
              previewUrl: item.preview_url || '',
              artworkUrl: item.album?.images?.[0]?.url || '',
              spotifyUrl: item.external_urls?.spotify || `https://open.spotify.com/search/${query}`,
              appleMusicUrl: `https://music.apple.com/us/search?term=${query}`,
              source: 'spotify',
            });
          }
        }

        payload = {
          type: 'OAUTH_AUTH_SUCCESS',
          provider: 'spotify',
          status: 'connected',
          profileName,
          tracks,
        };
      }
    } catch {
      // Handled gracefully by postMessage fallback
    }
  }

  const html = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Wavelet — Account Connected</title>
    <style>
      body {
        background: #0d0914;
        color: #f8fafc;
        font-family: system-ui, -apple-system, sans-serif;
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100vh;
        margin: 0;
        text-align: center;
      }
      .card {
        padding: 24px 32px;
        border-radius: 24px;
        background: rgba(255,255,255,0.06);
        border: 1px solid rgba(255,255,255,0.12);
      }
    </style>
  </head>
  <body>
    <div class="card">
      <h2>Music Account Linked</h2>
      <p>Returning to Wavelet...</p>
    </div>
    <script>
      (function() {
        var data = ${JSON.stringify(payload)};
        if (window.opener) {
          window.opener.postMessage(data, '*');
          setTimeout(function() { window.close(); }, 350);
        } else {
          window.location.href = '/';
        }
      })();
    </script>
  </body>
</html>`;

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'X-Robots-Tag': 'noindex, nofollow' },
  });
}
