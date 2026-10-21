'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CaretDown, Check, MagnifyingGlass, VinylRecord } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArtistPicker } from './ArtistPicker';
import { GENRE_PRESETS } from '@/lib/music-catalog';
import type { FilterMode } from '@/lib/game-rules';
import type { ArtistChoice } from '@/lib/catalog-filters';
import { audioEngine } from '@/lib/audio-engine';

export interface CratePickerProps {
  mode: FilterMode; value: string; artist: ArtistChoice | null; customSearch: string;
  onSelect: (mode: FilterMode, value: string) => void;
  onArtist: (artist: ArtistChoice) => void;
  onSearch: (term: string) => void;
  onAccount: () => void;
  reducedMotion?: boolean;
}

export function CratePicker(props: CratePickerProps) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('genre');
  const [search, setSearch] = useState('');
  const label = props.mode === 'artist' ? props.artist?.name || props.value : props.mode === 'account' ? 'My music crate' : props.customSearch || (props.value === 'All' ? 'Original mix' : props.value);
  const select = (mode: FilterMode, value: string) => { audioEngine.playUiTick(); props.onSelect(mode, value); setOpen(false); };

  return <Popover open={open} onOpenChange={next => { setOpen(next); if (next) { setTab(props.mode === 'artist' ? 'artist' : props.customSearch ? 'search' : 'genre'); audioEngine.playTabSwitch(); } }}>
    <PopoverTrigger asChild><Button variant="outline" className="crate-trigger" aria-label={`Choose music crate: ${label}`}><span className="crate-trigger-icon"><VinylRecord size={21} /></span><span><small>Your music</small><span className="crate-animated-label"><AnimatePresence mode="wait" initial={false}><motion.strong key={`${props.mode}:${label}`} initial={props.reducedMotion ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={props.reducedMotion ? { opacity: 0 } : { opacity: 0, y: -6 }} transition={{ duration: props.reducedMotion ? 0 : 0.16 }}>{label}{props.mode === 'artist' ? ' only' : ''}</motion.strong></AnimatePresence></span></span><CaretDown size={15} className="crate-chevron ml-auto shrink-0 text-muted-foreground" /></Button></PopoverTrigger>
    <PopoverContent className="crate-popover" align="start" sideOffset={10}>
      <div className="crate-popover-heading"><h3>Free original grooves</h3><p>These are Wavelet-created demo loops, not recognizable commercial recordings. Choose a mix or studio project.</p></div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="crate-tabs"><TabsTrigger value="genre">Genres</TabsTrigger><TabsTrigger value="artist">Artists</TabsTrigger><TabsTrigger value="search"><MagnifyingGlass size={16} /><span className="sr-only">Search catalog</span></TabsTrigger></TabsList>
        <TabsContent value="genre"><div className="crate-choice-list">{GENRE_PRESETS.map(genre => <button type="button" key={genre.id} onClick={() => select('genre', genre.id)}><span>{genre.label}</span>{props.mode === 'genre' && props.value === genre.id && !props.customSearch && <Check size={16} weight="bold" />}</button>)}</div></TabsContent>
        <TabsContent value="artist"><ArtistPicker selected={props.artist} onSelect={artist => { props.onArtist(artist); setOpen(false); }} /></TabsContent>
        <TabsContent value="search"><form className="crate-custom-search" onSubmit={event => { event.preventDefault(); if (search.trim().length > 1) { props.onSearch(search.trim()); setOpen(false); } }}><label htmlFor="catalog-search">Search the whole catalog</label><input id="catalog-search" value={search} onChange={event => setSearch(event.target.value)} placeholder="An artist, genre, year, or mood…" /><p>For songs exclusively by one artist, choose the Artists tab.</p><Button type="submit" disabled={search.trim().length < 2}>Find music</Button></form></TabsContent>
      </Tabs>
      <p className="crate-picker-note">Catalog is limited to original royalty-free demo compositions while Wavelet is free.</p>
    </PopoverContent>
  </Popover>;
}
