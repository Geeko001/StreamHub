import type { Lyrics, LyricLine } from '@/types';
import { getCache, setCache } from '@/lib/db/db';

const LRCLIB_API = 'https://lrclib.net/api';

/**
 * LRCLib Service - Fetches synced lyrics
 */
class LyricsService {
    /**
     * Search for lyrics by track info
     */
    async getLyrics(
        title: string,
        artist: string,
        album?: string,
        duration?: number
    ): Promise<Lyrics | null> {
        // Check cache first
        const cacheKey = `lyrics_${artist}_${title}`.toLowerCase().replace(/\s+/g, '_');
        const cached = await getCache<Lyrics>(cacheKey);
        if (cached) return cached;

        try {
            // Try exact match first
            const params = new URLSearchParams({
                track_name: title,
                artist_name: artist,
            });

            if (album) params.set('album_name', album);
            if (duration) params.set('duration', String(duration));

            const response = await fetch(`${LRCLIB_API}/get?${params}`);

            if (response.ok) {
                const data = await response.json();
                const lyrics = this.parseLRCLibResponse(data, `${artist}_${title}`);

                if (lyrics) {
                    // Cache for 24 hours
                    await setCache(cacheKey, lyrics, 24 * 60 * 60);
                }

                return lyrics;
            }

            // Try search if exact match fails
            if (response.status === 404) {
                return this.searchLyrics(title, artist, cacheKey);
            }

            return null;
        } catch (error) {
            console.error('[LyricsService] Error fetching lyrics:', error);
            return null;
        }
    }

    /**
     * Search for lyrics when exact match fails
     */
    private async searchLyrics(
        title: string,
        artist: string,
        cacheKey: string
    ): Promise<Lyrics | null> {
        try {
            const query = `${artist} ${title}`;
            const response = await fetch(
                `${LRCLIB_API}/search?q=${encodeURIComponent(query)}`
            );

            if (!response.ok) return null;

            const results = await response.json();

            if (!Array.isArray(results) || results.length === 0) return null;

            // Find best match (prefer synced lyrics)
            const bestMatch =
                results.find((r: { syncedLyrics?: string }) => r.syncedLyrics) || results[0];

            const lyrics = this.parseLRCLibResponse(bestMatch, `${artist}_${title}`);

            if (lyrics) {
                await setCache(cacheKey, lyrics, 24 * 60 * 60);
            }

            return lyrics;
        } catch (error) {
            console.error('[LyricsService] Search error:', error);
            return null;
        }
    }

    /**
     * Parse LRCLib response
     */
    private parseLRCLibResponse(
        data: { syncedLyrics?: string; plainLyrics?: string },
        trackId: string
    ): Lyrics | null {
        if (!data) return null;

        // Prefer synced lyrics
        if (data.syncedLyrics) {
            const lines = this.parseLRC(data.syncedLyrics);
            return {
                trackId,
                synced: true,
                lines,
                source: 'lrclib',
            };
        }

        // Fall back to plain lyrics
        if (data.plainLyrics) {
            const lines: LyricLine[] = data.plainLyrics
                .split('\n')
                .filter((line: string) => line.trim())
                .map((text: string, index: number) => ({
                    time: index * 3, // Estimate ~3 seconds per line
                    text: text.trim(),
                }));

            return {
                trackId,
                synced: false,
                lines,
                source: 'lrclib',
            };
        }

        return null;
    }

    /**
     * Parse LRC format to timestamped lines
     */
    private parseLRC(lrc: string): LyricLine[] {
        const lines: LyricLine[] = [];
        const regex = /\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\](.*)/g;

        let match;
        while ((match = regex.exec(lrc)) !== null) {
            const minutes = parseInt(match[1], 10);
            const seconds = parseInt(match[2], 10);
            const ms = match[3] ? parseInt(match[3].padEnd(3, '0'), 10) : 0;
            const text = match[4].trim();

            if (text) {
                lines.push({
                    time: minutes * 60 + seconds + ms / 1000,
                    text,
                });
            }
        }

        return lines.sort((a, b) => a.time - b.time);
    }

    /**
     * Get current lyric line based on time
     */
    getCurrentLine(lyrics: Lyrics, currentTime: number): number {
        if (!lyrics.synced || lyrics.lines.length === 0) return -1;

        // Find the last line that has started
        for (let i = lyrics.lines.length - 1; i >= 0; i--) {
            if (currentTime >= lyrics.lines[i].time) {
                return i;
            }
        }

        return -1;
    }
}

export const lyricsService = new LyricsService();
