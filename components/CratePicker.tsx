'use client';

import { useState } from 'react';
import { CaretDown, Check, MagnifyingGlass, SpotifyLogo, VinylRecord } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArtistPicker } from './ArtistPicker';
import { GENRE_PRESETS, YEAR_PRESETS } from '@/lib/music-catalog';
import type { FilterMode } from '@/lib/game-rules';
import type { ArtistChoice } from '@/lib/catalog-filters';
import { audioEngine } from '@/lib/audio-engine';

export interface CratePickerProps {
  mode: FilterMode; value: string; artist: ArtistChoice | null; customSearch: string;
  onSelect: (mode: FilterMode, value: string) => void;
  onArtist: (artist: ArtistChoice) => void;
  onSearch: (term: string) => void;
  onAccount: () => void;
}

export function CratePicker(props: CratePickerProps) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('genre');
  const [search, setSearch] = useState('');
  const label = props.mode === 'artist' ? props.artist?.name || props.value : props.mode === 'account' ? 'My music crate' : props.customSearch || (props.value === 'All' ? 'All hits' : props.value);
  const select = (mode: FilterMode, value: string) => { audioEngine.playUiTick(); props.onSelect(mode, value); setOpen(false); };

  return <Popover open={open} onOpenChange={next => { setOpen(next); if (next) { setTab(props.mode === 'artist' ? 'artist' : props.mode === 'year' ? 'year' : props.customSearch ? 'search' : 'genre'); audioEngine.playTabSwitch(); } }}>
    <PopoverTrigger asChild><Button variant="outline" className="crate-trigger" aria-label={`Choose music crate: ${label}`}><span className="crate-trigger-icon"><VinylRecord size={21} /></span><span><small>Your music</small><strong>{label}{props.mode === 'artist' ? ' only' : ''}</strong></span><CaretDown size={15} className="ml-auto shrink-0 text-muted-foreground" /></Button></PopoverTrigger>
    <PopoverContent className="crate-popover" align="start" sideOffset={10}>
      <div className="crate-popover-heading"><h3>Find your groove</h3><p>Choose a mix, or make it all about one artist.</p></div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="crate-tabs"><TabsTrigger value="genre">Genres</TabsTrigger><TabsTrigger value="artist">Artists</TabsTrigger><TabsTrigger value="year">Decades</TabsTrigger><TabsTrigger value="search"><MagnifyingGlass size={16} /><span className="sr-only">Search catalog</span></TabsTrigger></TabsList>
        <TabsContent value="genre"><div className="crate-choice-list">{GENRE_PRESETS.map(genre => <button type="button" key={genre.id} onClick={() => select('genre', genre.id)}><span>{genre.label}</span>{props.mode === 'genre' && props.value === genre.id && !props.customSearch && <Check size={16} weight="bold" />}</button>)}</div></TabsContent>
        <TabsContent value="artist"><ArtistPicker selected={props.artist} onSelect={artist => { props.onArtist(artist); setOpen(false); }} /></TabsContent>
        <TabsContent value="year"><div className="crate-choice-list">{YEAR_PRESETS.map(era => <button key={era.id} type="button" onClick={() => select('year', era.id)}><span>{era.label}</span>{props.mode === 'year' && props.value === era.id && <Check size={16} weight="bold" />}</button>)}</div></TabsContent>
        <TabsContent value="search"><form className="crate-custom-search" onSubmit={event => { event.preventDefault(); if (search.trim().length > 1) { props.onSearch(search.trim()); setOpen(false); } }}><label htmlFor="catalog-search">Search the whole catalog</label><input id="catalog-search" value={search} onChange={event => setSearch(event.target.value)} placeholder="An artist, genre, year, or mood…" /><p>For songs exclusively by one artist, choose the Artists tab.</p><Button type="submit" disabled={search.trim().length < 2}>Find music</Button></form></TabsContent>
      </Tabs>
      <button type="button" className="crate-account-link" onClick={() => { setOpen(false); props.onAccount(); }}><SpotifyLogo size={17} /><span>Use my music crate</span></button>
    </PopoverContent>
  </Popover>;
}
