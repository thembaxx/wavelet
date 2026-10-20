import { ImageResponse } from 'next/og';
import { BRAND } from './brand';

export const SOCIAL_IMAGE_ALT = 'Wavelet. Little clips. Big music energy. The music guessing game.';
export const SOCIAL_IMAGE_SIZE = { width: 1200, height: 630 };

export function renderSocialImage() {
  return new ImageResponse(
    <div style={{ width: '100%', height: '100%', display: 'flex', background: '#f7f8f2', color: '#203d32', padding: '64px 72px', flexDirection: 'column', position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <svg width="60" height="60" viewBox="0 0 48 48" fill="none"><path d="M7 18c3 0 3 14 7 14s6-21 10-21 6 21 10 21 4-14 7-14" stroke="#16836f" strokeWidth="4.5" strokeLinecap="round" /></svg>
        <span style={{ fontSize: 44, fontWeight: 800, letterSpacing: -2 }}>wavelet.</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', marginTop: 66, fontSize: 78, fontWeight: 800, letterSpacing: -4, lineHeight: 1.05 }}><span>Little clips.</span><span style={{ color: '#176b56' }}>Big music energy.</span></div>
      <div style={{ display: 'flex', marginTop: 36, fontSize: 24, color: '#52665d' }}>Guess the track. Find your groove.</div>
      <div style={{ position: 'absolute', right: -60, top: 115, width: 330, height: 330, borderRadius: '50%', background: '#203d32', border: '14px solid #31544a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ border: '3px solid #587e65', borderRadius: '50%', width: 240, height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ display: 'flex', borderRadius: '50%', width: 110, height: 110, background: '#deedc5', alignItems: 'center', justifyContent: 'center' }}><div style={{ width: 16, height: 16, borderRadius: '50%', background: '#203d32' }} /></div></div></div>
      <div style={{ display: 'flex', position: 'absolute', bottom: 48, left: 72, fontSize: 18, color: '#176b56' }}>{BRAND.name} · The music guessing game</div>
    </div>, SOCIAL_IMAGE_SIZE,
  );
}
