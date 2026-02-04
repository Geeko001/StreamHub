import type { PipedSearchResult, PipedStreamInfo, Track } from '@/types';
import { getCache, setCache } from '@/lib/db/db';

// Piped instances - fallback list
const PIPED_INSTANCES = [
    'https://pipedapi.kavin.rocks',
    'https://api-piped.mha.fi',
    'https://pipedapi.in.projectsegfau.lt',
    'https://pipedapi.adminforge.de',
];

let currentInstanceIndex = 0;

/**
 * Get the current Piped API instance
 */
function getPipedInstance(): string {
    return PIPED_INSTANCES[currentInstanceIndex];
}

/**
 * Rotate to next Piped instance on failure
 */
function rotateInstance(): void {
    currentInstanceIndex = (currentInstanceIndex + 1) % PIPED_INSTANCES.length;
    console.log('[StreamResolver] Rotated to instance:', getPipedInstance());
}

/**
 * Stream Resolver - Bridges Spotify metadata to actual audio streams via Piped
 */
class StreamResolver {
    /**
     * Resolve a Spotify track to a playable stream URL
     */
    async resolveTrack(track: Track): Promise<string | null> {
        if (!track.spotifyId) {
            console.warn('[StreamResolver] Track has no Spotify ID');
            return null;
        }

        // Check cache first
        const cacheKey = `stream_${track.spotifyId}`;
        const cached = await getCache<string>(cacheKey);
        if (cached) {
            console.log('[StreamResolver] Cache hit for:', track.title);
            return cached;
        }

        try {
            // Search on Piped using artist and title
            const searchQuery = `${track.artist} ${track.title}`;
            const videoId = await this.searchVideo(searchQuery, track.duration);

            if (!videoId) {
                console.warn('[StreamResolver] No matching video found for:', track.title);
                return null;
            }

            // Get stream URL
            const streamUrl = await this.getAudioStream(videoId);

            if (streamUrl) {
                // Cache for 6 hours (stream URLs expire)
                await setCache(cacheKey, streamUrl, 6 * 60 * 60);
            }

            return streamUrl;
        } catch (error) {
            console.error('[StreamResolver] Error resolving track:', error);
            rotateInstance();
            return null;
        }
    }

    /**
     * Search for a video on Piped
     */
    private async searchVideo(query: string, targetDuration?: number): Promise<string | null> {
        const instance = getPipedInstance();
        const url = `${instance}/search?q=${encodeURIComponent(query)}&filter=music_songs`;

        try {
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`Search failed: ${response.status}`);
            }

            const data = await response.json();
            const items: PipedSearchResult[] = data.items || [];

            if (items.length === 0) {
                // Try without filter
                const fallbackResponse = await fetch(
                    `${instance}/search?q=${encodeURIComponent(query)}`
                );
                const fallbackData = await fallbackResponse.json();
                items.push(...(fallbackData.items || []));
            }

            if (items.length === 0) return null;

            // Find best match based on duration similarity
            let bestMatch = items[0];

            if (targetDuration) {
                let smallestDiff = Infinity;

                for (const item of items) {
                    const diff = Math.abs(item.duration - targetDuration);
                    if (diff < smallestDiff) {
                        smallestDiff = diff;
                        bestMatch = item;
                    }

                    // If within 5 seconds, it's likely the right one
                    if (diff <= 5) break;
                }
            }

            // Extract video ID from URL
            const videoUrl = bestMatch.url;
            const videoId = videoUrl.split('v=')[1] || videoUrl.split('/watch/')[1];

            return videoId || null;
        } catch (error) {
            console.error('[StreamResolver] Search error:', error);
            throw error;
        }
    }

    /**
     * Get audio stream URL for a video
     */
    private async getAudioStream(videoId: string): Promise<string | null> {
        const instance = getPipedInstance();
        const url = `${instance}/streams/${videoId}`;

        try {
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`Stream fetch failed: ${response.status}`);
            }

            const data: PipedStreamInfo = await response.json();

            // Sort audio streams by bitrate (highest first)
            const audioStreams = [...data.audioStreams].sort(
                (a, b) => (b.bitrate || 0) - (a.bitrate || 0)
            );

            // Prefer opus or m4a formats
            const preferredStream =
                audioStreams.find(
                    (s) => s.mimeType?.includes('opus') || s.format?.includes('opus')
                ) ||
                audioStreams.find(
                    (s) => s.mimeType?.includes('mp4a') || s.format?.includes('m4a')
                ) ||
                audioStreams[0];

            if (!preferredStream) {
                console.warn('[StreamResolver] No audio streams found');
                return null;
            }

            console.log(
                `[StreamResolver] Selected stream: ${preferredStream.quality} @ ${preferredStream.bitrate}bps`
            );

            return preferredStream.url;
        } catch (error) {
            console.error('[StreamResolver] Stream error:', error);
            throw error;
        }
    }

    /**
     * Resolve and update track with stream URL
     */
    async resolveAndUpdate(track: Track): Promise<Track> {
        const streamUrl = await this.resolveTrack(track);

        return {
            ...track,
            streamUrl: streamUrl || undefined,
            source: 'stream',
        };
    }

    /**
     * Check if a Piped instance is healthy
     */
    async checkInstance(instanceUrl: string): Promise<boolean> {
        try {
            const response = await fetch(`${instanceUrl}/healthcheck`, {
                signal: AbortSignal.timeout(5000),
            });
            return response.ok;
        } catch {
            return false;
        }
    }

    /**
     * Find fastest healthy instance
     */
    async findBestInstance(): Promise<string> {
        const results = await Promise.all(
            PIPED_INSTANCES.map(async (instance) => {
                const start = performance.now();
                const healthy = await this.checkInstance(instance);
                const latency = performance.now() - start;
                return { instance, healthy, latency };
            })
        );

        const healthy = results.filter((r) => r.healthy).sort((a, b) => a.latency - b.latency);

        if (healthy.length > 0) {
            const best = healthy[0].instance;
            currentInstanceIndex = PIPED_INSTANCES.indexOf(best);
            console.log(`[StreamResolver] Best instance: ${best} (${Math.round(healthy[0].latency)}ms)`);
            return best;
        }

        return PIPED_INSTANCES[0];
    }
}

export const streamResolver = new StreamResolver();
