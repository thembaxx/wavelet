import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.redirect(new URL('/?music=originals-only', process.env.NEXT_PUBLIC_SITE_URL || 'https://wavelet.themba.dev'));
}
