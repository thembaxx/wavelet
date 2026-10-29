"use client";

import { useEffect, useState } from "react";
import { Check, CircleNotch, MagnifyingGlass, MicrophoneStage } from "@phosphor-icons/react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { ARTIST_PRESETS } from "@/lib/music-catalog";
import type { ArtistChoice } from "@/lib/catalog-filters";

const SUGGESTIONS: ArtistChoice[] = ARTIST_PRESETS.slice(0, 7).map((artist) => ({
  id: artist.id,
  name: artist.label,
  genre: artist.genre,
}));

export function ArtistPicker({
  selected,
  onSelect,
}: {
  selected: ArtistChoice | null;
  onSelect: (artist: ArtistChoice) => void;
}) {
  const [query, setQuery] = useState("");
  const [artists, setArtists] = useState<ArtistChoice[]>(SUGGESTIONS);
  const [loading, setLoading] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      if (query.trim().length < 2) {
        setArtists(SUGGESTIONS);
        setLoading(false);
        setUnavailable(false);
        return;
      }
      setLoading(true);
      setUnavailable(false);
      try {
        const response = await fetch(`/api/artists?term=${encodeURIComponent(query.trim())}`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Search unavailable");
        const data = await response.json();
        if (!controller.signal.aborted) setArtists(Array.isArray(data.artists) ? data.artists : []);
      } catch {
        if (controller.signal.aborted) return;
        setArtists(
          SUGGESTIONS.filter((artist) => artist.name.toLowerCase().includes(query.toLowerCase())),
        );
        setUnavailable(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 280);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  return (
    <Command label="Search for an artist" shouldFilter={false} className="artist-command">
      <CommandInput
        placeholder="Find an artist…"
        value={query}
        onValueChange={(value) => {
          setQuery(value);
          setArtists(value.trim().length < 2 ? SUGGESTIONS : []);
          setLoading(value.trim().length >= 2);
          setUnavailable(false);
        }}
      />
      <div className="crate-search-status" role="status">
        {loading ? (
          <>
            <CircleNotch className="animate-spin" size={14} /> Searching artists…
          </>
        ) : unavailable ? (
          "Offline suggestions. Your artist filter stays exact."
        ) : query.length < 2 ? (
          "A few favorites to get you started"
        ) : (
          "Choose an artist for an exclusive crate"
        )}
      </div>
      <CommandList label="Artist search results">
        {!loading && (
          <CommandEmpty>
            <MagnifyingGlass size={22} />
            <span>No artists found. Try another name.</span>
          </CommandEmpty>
        )}
        <CommandGroup>
          {artists.map((artist) => (
            <CommandItem
              key={artist.id}
              value={artist.id}
              onSelect={() => onSelect(artist)}
              className="artist-result"
            >
              <span className="artist-result-avatar">
                <MicrophoneStage size={18} />
              </span>
              <span className="artist-result-name">
                <strong>{artist.name}</strong>
                <small>{artist.genre || "Artist"}</small>
              </span>
              {selected?.name === artist.name && (
                <Check size={18} weight="bold" className="text-primary" />
              )}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
      <p className="crate-picker-note">Just their songs. No covers from other artists.</p>
    </Command>
  );
}
