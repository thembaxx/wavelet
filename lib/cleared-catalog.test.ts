import test from 'node:test';
import assert from 'node:assert/strict';
import { FREE_GAME_TRACKS, freeGameCatalog, getOriginalGroove, isFreeGameTrack } from './cleared-catalog.ts';

test('all free tracks are original and independently approved against the catalog manifest', () => {
  assert.equal(FREE_GAME_TRACKS.length, 24);
  for (const track of FREE_GAME_TRACKS) {
    assert.equal(track.releaseYear, 2026);
    assert.equal(track.source, 'original');
    assert.ok(getOriginalGroove(track.previewUrl));
    assert.ok(isFreeGameTrack(track));
    assert.equal(track.rights?.provider, 'wavelet-original');
  }
  for (const field of ['title', 'artist', 'genre', 'releaseYear', 'previewUrl', 'source'] as const) {
    const altered = { ...FREE_GAME_TRACKS[0], [field]: 'forged' };
    assert.equal(isFreeGameTrack(altered), false, 'forged ' + field);
  }
  assert.equal(isFreeGameTrack({ ...FREE_GAME_TRACKS[0], rights: undefined }), false);
  assert.equal(isFreeGameTrack({ ...FREE_GAME_TRACKS[0], rights: { ...FREE_GAME_TRACKS[0].rights!, territories: [] } }), false);
  assert.equal(getOriginalGroove('https://audio-ssl.itunes.apple.com/clip.m4a'), undefined);
  assert.equal(getOriginalGroove('wavelet-original:unknown'), undefined);
});

test('tracks are returned by defensive copy, and three modes have four valid answers', () => {
  const copy = freeGameCatalog();
  copy[0].title = 'Modified';
  copy[0].rights!.territories.length = 0;
  assert.notEqual(FREE_GAME_TRACKS[0].title, 'Modified');
  assert.deepEqual(FREE_GAME_TRACKS[0].rights?.territories, ['*']);
  assert.ok(new Set(FREE_GAME_TRACKS.map(t => t.title)).size >= 4);
  assert.ok(new Set(FREE_GAME_TRACKS.map(t => t.artist)).size >= 4);
  assert.ok(new Set(FREE_GAME_TRACKS.map(t => t.genre)).size >= 4);
});
