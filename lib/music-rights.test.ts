import test from 'node:test';
import assert from 'node:assert/strict';
import { isLicensedTrack, canPlayLicensedTrack } from './music-rights.ts';

const valid = {
  id: 'cleared-1', title: 'Independent song', artist: 'Independent artist',
  album: 'Release', decade: '2020s', releaseYear: 2026, genre: 'Pop',
  previewUrl: 'https://approved.example/audio.mp3', artworkUrl: '',
  rights: {
    licenseId: 'signed-contract-1', provider: 'direct', allowedUses: ['solo','multiplayer'],
    territories: ['ZA'], maxClipSeconds: 10, expiresAt: '2030-01-01T00:00:00Z',
  },
};
const now = Date.parse('2026-10-21T00:00:00Z');
test('rejects a promotional preview without explicit rights', () => {
  assert.equal(isLicensedTrack({ ...valid, rights: undefined }), false);
  assert.equal(isLicensedTrack({ ...valid, previewUrl: 'https://audio-ssl.itunes.apple.com/song.m4a' }), false);
  assert.equal(isLicensedTrack({ ...valid, previewUrl: 'http://approved.example/audio.mp3' }), false);
});
test('requires allowed game use, known licensed country, and sufficient clip length', () => {
  assert.equal(canPlayLicensedTrack(valid, 'solo', 5, 'ZA', now), true);
  assert.equal(canPlayLicensedTrack(valid, 'multiplayer', 5, null, now), false);
  assert.equal(canPlayLicensedTrack(valid, 'solo', 15, 'ZA', now), false);
  assert.equal(canPlayLicensedTrack(valid, 'solo', 5, 'US', now), false);
  assert.equal(canPlayLicensedTrack({ ...valid, rights: {...valid.rights, allowedUses:['solo']} }, 'multiplayer', 5, 'ZA', now), false);
  assert.equal(canPlayLicensedTrack({ ...valid, rights: {...valid.rights, territories:['*']} }, 'multiplayer', 5, null, now), true);
});
test('enforces both contract expiry and temporary URL expiry, including a validity margin', () => {
  const near = new Date(now + 5000).toISOString();
  assert.equal(canPlayLicensedTrack({ ...valid, rights: { ...valid.rights, expiresAt: near } }, 'solo', 5, 'ZA', now), false);
  assert.equal(canPlayLicensedTrack({ ...valid, rights: { ...valid.rights, playbackExpiresAt: near } }, 'solo', 5, 'ZA', now), false);
  assert.equal(canPlayLicensedTrack({ ...valid, rights: { ...valid.rights, playbackExpiresAt: new Date(now+90000).toISOString() } }, 'solo', 5, 'ZA', now, 90000), false);
  assert.equal(canPlayLicensedTrack({ ...valid, rights: { ...valid.rights, validFrom: new Date(now+30000).toISOString() } }, 'solo', 5, 'ZA', now), false);
});
