// Track represents a single music track (local or streaming)
export interface Track {
    id: string;
    title: string;
    artist: string;
    album: string;
    duration: number; // in seconds
    coverArt?: string; // URL or base64
    source: 'local' | 'spotify' | 'stream';

    // Local file specific
    fileHandle?: FileSystemFileHandle;

    // Streaming specific
    spotifyId?: string;
    streamUrl?: string;

    // Metadata
    bitrate?: number;
    format?: string;
    dateAdded?: number;
}

// Album grouping
export interface Album {
    id: string;
    name: string;
    artist: string;
    coverArt?: string;
    tracks: Track[];
    year?: number;
}

// Playlist
export interface Playlist {
    id: string;
    name: string;
    description?: string;
    coverArt?: string;
    trackIds: string[];
    createdAt: number;
    updatedAt: number;
}

// EQ Preset
export interface EQPreset {
    name: string;
    bands: number[]; // 10 bands, -12 to +12 dB
}

// Lyrics
export interface LyricLine {
    time: number; // in seconds
    text: string;
}

export interface Lyrics {
    trackId: string;
    synced: boolean;
    lines: LyricLine[];
    source?: string;
}

// Spotify API types
export interface SpotifyTrack {
    id: string;
    name: string;
    artists: { name: string }[];
    album: {
        name: string;
        images: { url: string; width: number }[];
    };
    duration_ms: number;
}

export interface SpotifySearchResult {
    tracks: {
        items: SpotifyTrack[];
        total: number;
    };
}

// Piped API types
export interface PipedSearchResult {
    url: string;
    title: string;
    uploaderName: string;
    duration: number;
    thumbnail: string;
}

export interface PipedStreamInfo {
    title: string;
    uploader: string;
    duration: number;
    audioStreams: {
        url: string;
        format: string;
        quality: string;
        bitrate: number;
        mimeType: string;
    }[];
}

// Player State
export type RepeatMode = 'off' | 'one' | 'all';

export interface PlayerState {
    currentTrack: Track | null;
    isPlaying: boolean;
    progress: number;
    duration: number;
    volume: number;
    muted: boolean;
    shuffle: boolean;
    repeat: RepeatMode;
    queue: Track[];
    queueIndex: number;
    eqEnabled: boolean;
    eqBands: number[];
}

// View types
export type ViewType = 'home' | 'library' | 'search' | 'nowPlaying' | 'settings';
export type LibraryTab = 'local' | 'spotify' | 'playlists';
