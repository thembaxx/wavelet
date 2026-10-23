import test from "node:test";
import assert from "node:assert/strict";
import { artistOnlyTracks, matchesArtist, normalizeArtist } from "./catalog-filters.ts";
import { filterAndSelectSongs, type SongTrack } from "./game-rules.ts";

const track = (id: string, artist: string, artistId?: number): SongTrack => ({
  id,
  artist,
  artistId,
  title: id,
  album: "Test",
  releaseYear: 2024,
  decade: "2020s",
  genre: "Pop",
  previewUrl: "",
  artworkUrl: "",
});

test("artist matching tolerates accents, case, and spacing without admitting covers or collaborations", () => {
  assert.equal(normalizeArtist("  BEYONCÉ  "), "beyonce");
  assert.equal(matchesArtist(track("a", "Beyoncé"), " beyonce "), true);
  assert.equal(matchesArtist(track("b", "Daft Punk"), "DAFT  PUNK"), true);
  for (const artist of [
    "Daft Punk Tribute",
    "Daft Punk & Friends",
    "The Daft Punk Orchestra",
    "Punk",
  ]) {
    assert.equal(matchesArtist(track(artist, artist), "Daft Punk"), false);
  }
});

test("catalog artist identity distinguishes identically named artists and supports legacy tracks", () => {
  assert.equal(matchesArtist(track("a", "Phoenix", 100), "Phoenix", "200"), false);
  assert.equal(matchesArtist(track("a", "Phoenix", 100), "Phoenix", "100"), true);
  assert.equal(matchesArtist(track("legacy", "Phoenix"), "Phoenix", "100"), true);
  assert.equal(matchesArtist(track("legacy", "Other"), "Phoenix", "100"), false);
  const songs = [track("a", "Phoenix", 100), track("b", "Phoenix", 200), track("c", "Other")];
  assert.deepEqual(
    artistOnlyTracks(songs, "Phoenix", "100").map((song) => song.id),
    ["a"],
  );
  assert.equal(songs.length, 3, "Filtering does not mutate the shared catalog");
});

test("short and empty artist sets never borrow unrelated songs to reach the requested count", () => {
  const songs = [track("a", "Daft Punk"), track("b", "SZA"), track("c", "Daft Punk Tribute")];
  const config = {
    filterMode: "artist" as const,
    filterValue: "Daft Punk",
    snippetDuration: 5 as const,
    songCount: 15,
    playMode: "quiz-4choice" as const,
  };
  assert.deepEqual(
    filterAndSelectSongs(songs, config).map((song) => song.id),
    ["a"],
  );
  assert.deepEqual(filterAndSelectSongs(songs, { ...config, filterValue: "Missing artist" }), []);
});
