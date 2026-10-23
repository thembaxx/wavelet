import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const clientOrigin = searchParams.get("origin") || process.env.APP_URL || "http://localhost:3000";
  const baseUrl =
    process.env.APP_URL && !process.env.APP_URL.includes("MY_APP_URL")
      ? process.env.APP_URL.replace(/\/$/, "")
      : clientOrigin.replace(/\/$/, "");

  const redirectUri = `${baseUrl}/auth/callback`;
  const clientId = process.env.SPOTIFY_CLIENT_ID || "";

  const params = new URLSearchParams({
    client_id: clientId || "SPOTIFY_CLIENT_ID_NOT_SET",
    response_type: "code",
    redirect_uri: redirectUri,
    scope: "user-top-read user-read-recently-played playlist-modify-public",
    show_dialog: "true",
  });

  const authUrl = `https://accounts.spotify.com/authorize?${params.toString()}`;

  return NextResponse.json({
    url: authUrl,
    redirectUri,
    configured: Boolean(clientId && clientId !== "MY_SPOTIFY_CLIENT_ID"),
    appleMusicConfigured: Boolean(process.env.APPLE_MUSIC_DEVELOPER_TOKEN),
  });
}
