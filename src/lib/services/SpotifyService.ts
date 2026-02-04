import { Track } from '@/types';

class SpotifyService {
    private accessToken: string | null = null;
    private tokenExpiration: number = 0;

    constructor() {
        this.init();
    }

    private async init() {
        // Auto-fetch token on init
        await this.getAccessToken();
    }

    /**
     * Get anonymous access token from our backend proxy
     */
    async getAccessToken(): Promise<string | null> {
        if (this.accessToken && Date.now() < this.tokenExpiration) {
            return this.accessToken;
        }

        try {
            // Fetch from our own Vercel API route
            const response = await fetch('/api/token');

            if (!response.ok) {
                throw new Error(`Token fetch failed: ${response.statusText}`);
            }

            const data = await response.json();
            this.accessToken = data.access_token;
            // Set expiration (usually 1 hour, shave off 5 mins for safety)
            this.tokenExpiration = Date.now() + (data.expires_in * 1000) - 300000;

            return this.accessToken;
        } catch (error) {
            console.error('Failed to get anonymous Spotify token:', error);
            return null;
        }
    }

    async search(query: string): Promise<Track[]> {
        const token = await this.getAccessToken();
        if (!token) return [];

        try {
            const response = await fetch(
                `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=20`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            if (!response.ok) {
                if (response.status === 401) {
                    // Token expired, retry once
                    this.accessToken = null;
                    return this.search(query);
                }
                throw new Error('Spotify API Error');
            }

            const data = await response.json();
            return data.tracks.items.map(this.mapSpotifyTrack);
        } catch (error) {
            console.error('Spotify search failed:', error);
            return [];
        }
    }

    // Note: Saved tracks endpoint is NOT available in Client Credentials flow
    // We can return an empty array or implement a local "Favorites" logic later
    async getSavedTracks(): Promise<Track[]> {
        return [];
    }

    isAuthenticated(): boolean {
        // In anonymous mode, we are "authenticated" if we have a token
        // But technically we don't need a login state for the UI
        return !!this.accessToken;
    }

    // No-op for login/logout in anonymous mode
    login() {
        console.log('Anonymous mode: No login required');
    }

    logout() {
        this.accessToken = null;
    }

    private mapSpotifyTrack(item: any): Track {
        const image = item.album.images[0]?.url || item.album.images[1]?.url;

        return {
            id: item.id,
            title: item.name,
            artist: item.artists.map((a: any) => a.name).join(', '),
            album: item.album.name,
            coverArt: image,
            duration: item.duration_ms / 1000,
            source: 'spotify',
            dateAdded: Date.now(),
        };
    }
}

export const spotifyService = new SpotifyService();
