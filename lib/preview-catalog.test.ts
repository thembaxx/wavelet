import test from "node:test";
import assert from "node:assert/strict";
import { isApplePreviewUrl, isPlayableTrack, previewTracks } from "./preview-catalog.ts";
import { searchPreviewSongs, searchPreviewArtists } from "./itunes-catalog.ts";
import { FREE_GAME_TRACKS } from "./cleared-catalog.ts";

const preview =
  "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/test/clip.aac.p.m4a";
const song = {
  kind: "song",
  trackId: 123,
  artistId: 5468295,
  trackName: "One More Time",
  artistName: "Daft Punk",
  collectionName: "Discovery",
  releaseDate: "2001-03-12T08:00:00Z",
  primaryGenreName: "Dance",
  previewUrl: preview,
  artworkUrl100: "https://is1-ssl.mzstatic.com/image/thumb/cover/100x100bb.jpg",
  trackViewUrl: "https://music.apple.com/za/album/discovery/1?i=123",
};

test("commercial metadata preserves real identity without asserting game rights", () => {
  const [track] = previewTracks([song]);
  assert.equal(track.id, "itunes:123");
  assert.equal(track.artistId, 5468295);
  assert.equal(track.title, "One More Time");
  assert.equal(track.releaseYear, 2001);
  assert.equal(track.decade, "2000s");
  assert.equal(track.rights, undefined);
  assert.equal(track.appleMusicUrl, song.trackViewUrl);
  assert.equal(isPlayableTrack(track), true);
  assert.equal(isPlayableTrack(FREE_GAME_TRACKS[0]), true);
  assert.equal(isPlayableTrack({ ...track, previewUrl: "https://example.com/song.mp3" }), false);
});

test("catalog rejects non-songs, absent previews, invalid dates and duplicate reissues", () => {
  assert.equal(
    previewTracks([
      song,
      { ...song, trackId: 456, collectionName: "Greatest Hits" },
      null,
      { ...song, kind: "music-video" },
      { ...song, previewUrl: undefined },
      { ...song, releaseDate: "unknown" },
      { ...song, trackId: "123" },
    ]).length,
    1,
  );
  const [track] = previewTracks([
    {
      ...song,
      trackViewUrl: "javascript:alert(1)",
      artworkUrl100: "https://example.com/cover.jpg",
    },
  ]);
  assert.equal(track.appleMusicUrl, undefined);
  assert.equal(track.artworkUrl, "");
  for (const url of [
    "http:" + preview.slice(6),
    preview.replace("itunes.apple.com", "itunes.apple.com.evil.test"),
    preview.replace("https://", "https://user:pass@"),
    "https://example.com/song.m4a",
    "wavelet-original:unknown",
    "https://audio-ssl.itunes.apple.com/clip.m4a",
  ]) {
    assert.equal(isApplePreviewUrl(url), false, url);
  }
});

test("artist lookup uses stable IDs and excludes other artists and covers", async (t) => {
  const urls: URL[] = [];
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request) => {
    urls.push(new URL(String(input)));
    return Response.json({
      results: [
        song,
        { ...song, trackId: 456, artistId: 999, artistName: "Daft Punk Tribute" },
        { ...song, trackId: 789, artistId: 888, artistName: "Daft Punk" },
      ],
    });
  });
  const tracks = await searchPreviewSongs("All", "Daft Punk", "5468295");
  assert.deepEqual(
    tracks.map((track) => track.id),
    ["itunes:123"],
  );
  assert.equal(urls[0].pathname, "/lookup");
  assert.equal(urls[0].searchParams.get("id"), "5468295");
  assert.equal(urls[0].searchParams.get("country"), "ZA");
});

test("default mix, search encoding, artist results and upstream failures", async (t) => {
  const urls: URL[] = [];
  const mock = t.mock.method(globalThis, "fetch", async (input: string | URL | Request) => {
    urls.push(new URL(String(input)));
    return Response.json({ results: [song] });
  });
  assert.equal((await searchPreviewSongs("All", "")).length, 1);
  assert.ok(urls[0].searchParams.get("id")!.includes(","));
  assert.deepEqual(
    await searchPreviewSongs("R&B/Soul", ""),
    [],
    "genre mixes exclude unrelated search matches",
  );
  assert.equal(urls[1].searchParams.get("term"), "R&B/Soul");
  assert.equal(urls[1].pathname, "/search");
  mock.mock.mockImplementation(async () =>
    Response.json({
      results: [
        {
          wrapperType: "artist",
          artistId: 5468295,
          artistName: "Daft Punk",
          primaryGenreName: "Dance",
        },
        song,
        null,
      ],
    }),
  );
  assert.deepEqual(await searchPreviewArtists("Daft"), [
    { id: "5468295", name: "Daft Punk", genre: "Dance" },
  ]);
  mock.mock.mockImplementation(async () => new Response("Unavailable", { status: 503 }));
  await assert.rejects(searchPreviewSongs("All", ""), /unavailable/);
  mock.mock.mockImplementation(async () => Response.json({ results: "bad" }));
  await assert.rejects(searchPreviewArtists("Daft"), /Invalid/);
});
