import { NextResponse } from "next/server";

// The Spotify developer policy prohibits music trivia games. Disabling account
// authentication prevents an accidental preview-catalog bypass of the rights gate.
export async function GET() {
  return NextResponse.json({
    configured: false,
    appleMusicConfigured: false,
    url: null,
    reason: "Music-provider sync is disabled for the free rights-cleared game.",
  });
}
