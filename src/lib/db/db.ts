import Dexie, { type Table } from 'dexie';
import type { Track, Album, Playlist } from '@/types';

/**
 * Streamix IndexedDB Database
 * Stores local library metadata and cached streaming data
 */
class StreamixDatabase extends Dexie {
    tracks!: Table<Track>;
    albums!: Table<Album>;
    playlists!: Table<Playlist>;
    cache!: Table<{ key: string; value: unknown; expiry: number }>;

    constructor() {
        super('StreamixDB');

        this.version(1).stores({
            tracks: '++id, title, artist, album, duration, source, dateAdded',
            albums: '++id, name, artist',
            playlists: '++id, name, createdAt',
            cache: 'key, expiry',
        });
    }
}

export const db = new StreamixDatabase();

// Helper functions

/**
 * Add a track to the library
 */
export async function addTrack(track: Omit<Track, 'id'>): Promise<string> {
    const id = await db.tracks.add({
        ...track,
        id: crypto.randomUUID(),
        dateAdded: Date.now(),
    } as Track);
    return String(id);
}

/**
 * Add multiple tracks
 */
export async function addTracks(tracks: Omit<Track, 'id'>[]): Promise<void> {
    await db.tracks.bulkAdd(
        tracks.map((track) => ({
            ...track,
            id: crypto.randomUUID(),
            dateAdded: Date.now(),
        })) as Track[]
    );
}

/**
 * Get all tracks
 */
export async function getAllTracks(): Promise<Track[]> {
    return db.tracks.toArray();
}

/**
 * Get tracks by source
 */
export async function getTracksBySource(source: Track['source']): Promise<Track[]> {
    return db.tracks.where('source').equals(source).toArray();
}

/**
 * Search tracks
 */
export async function searchTracks(query: string): Promise<Track[]> {
    const lowerQuery = query.toLowerCase();
    return db.tracks
        .filter(
            (track) =>
                track.title.toLowerCase().includes(lowerQuery) ||
                track.artist.toLowerCase().includes(lowerQuery) ||
                track.album.toLowerCase().includes(lowerQuery)
        )
        .toArray();
}

/**
 * Delete a track
 */
export async function deleteTrack(id: string): Promise<void> {
    await db.tracks.delete(id);
}

/**
 * Clear all local tracks
 */
export async function clearLocalTracks(): Promise<void> {
    await db.tracks.where('source').equals('local').delete();
}

/**
 * Get or create album
 */
export async function getOrCreateAlbum(name: string, artist: string): Promise<Album> {
    let album = await db.albums.where({ name, artist }).first();

    if (!album) {
        const id = crypto.randomUUID();
        album = { id, name, artist, tracks: [] };
        await db.albums.add(album);
    }

    return album;
}

/**
 * Create a playlist
 */
export async function createPlaylist(name: string, description?: string): Promise<Playlist> {
    const playlist: Playlist = {
        id: crypto.randomUUID(),
        name,
        description,
        trackIds: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
    };

    await db.playlists.add(playlist);
    return playlist;
}

/**
 * Get all playlists
 */
export async function getAllPlaylists(): Promise<Playlist[]> {
    return db.playlists.toArray();
}

/**
 * Add track to playlist
 */
export async function addToPlaylist(playlistId: string, trackId: string): Promise<void> {
    const playlist = await db.playlists.get(playlistId);
    if (playlist) {
        playlist.trackIds.push(trackId);
        playlist.updatedAt = Date.now();
        await db.playlists.put(playlist);
    }
}

/**
 * Cache helper - set with expiry
 */
export async function setCache(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    await db.cache.put({
        key,
        value,
        expiry: Date.now() + ttlSeconds * 1000,
    });
}

/**
 * Cache helper - get if not expired
 */
export async function getCache<T>(key: string): Promise<T | null> {
    const cached = await db.cache.get(key);

    if (!cached) return null;

    if (Date.now() > cached.expiry) {
        await db.cache.delete(key);
        return null;
    }

    return cached.value as T;
}

/**
 * Clear expired cache entries
 */
export async function clearExpiredCache(): Promise<void> {
    await db.cache.where('expiry').below(Date.now()).delete();
}
