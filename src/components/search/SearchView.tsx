import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Search as SearchIcon, Music, Play, Loader2 } from 'lucide-react';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { spotifyService } from '@/lib/services/SpotifyService';
import { streamResolver } from '@/lib/services/StreamResolver';
import { searchTracks } from '@/lib/db/db';
import type { Track } from '@/types';

export default function SearchView() {
    const { playTrack } = usePlayerStore();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<Track[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingTrackId, setLoadingTrackId] = useState<string | null>(null);

    const handleSearch = useCallback(async () => {
        if (!query.trim()) {
            setResults([]);
            return;
        }

        setLoading(true);

        try {
            // Search both local and Spotify
            const [localResults, spotifyResults] = await Promise.all([
                searchTracks(query),
                // Always try to search spotify in anonymous mode
                spotifyService.search(query),
            ]);

            // Combine and deduplicate
            const combined = [...localResults, ...spotifyResults];
            setResults(combined);
        } catch (err) {
            console.error('Search failed:', err);
        } finally {
            setLoading(false);
        }
    }, [query]);

    const handlePlayTrack = async (track: Track) => {
        // For Spotify tracks, resolve the stream first
        if (track.source === 'spotify' && !track.streamUrl) {
            setLoadingTrackId(track.id);

            try {
                const resolvedTrack = await streamResolver.resolveAndUpdate(track);

                if (resolvedTrack.streamUrl) {
                    playTrack(resolvedTrack, results);
                } else {
                    alert('Could not find a stream for this track. Try another version.');
                }
            } catch (err) {
                console.error('Stream resolution failed:', err);
                alert('Failed to load stream. Please try again.');
            } finally {
                setLoadingTrackId(null);
            }
        } else {
            playTrack(track, results);
        }
    };

    return (
        <div className="p-6">
            {/* Search Input */}
            <div className="relative mb-6">
                <SearchIcon
                    size={20}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary"
                />
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="Search artists, songs, albums..."
                    className="w-full pl-12 pr-4 py-4 bg-surface-container rounded-2xl text-white placeholder-secondary outline-none focus:ring-2 focus:ring-primary transition-shadow"
                />

                {loading && (
                    <Loader2
                        size={20}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-secondary animate-spin"
                    />
                )}
            </div>

            {/* Search Button */}
            <button
                onClick={handleSearch}
                disabled={loading || !query.trim()}
                className="w-full mb-6 py-3 bg-primary text-black font-medium rounded-xl hover:bg-primary-dim transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
                Search
            </button>


            {/* Results */}
            {results.length === 0 && query && !loading ? (
                <div className="text-center py-12">
                    <Music size={48} className="mx-auto text-secondary mb-4" />
                    <p className="text-secondary">No results found for "{query}"</p>
                </div>
            ) : (
                <div className="space-y-1">
                    {results.map((track, index) => (
                        <motion.div
                            key={track.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: Math.min(index * 0.03, 0.3) }}
                            className="flex items-center gap-4 p-3 rounded-xl hover:bg-surface-container transition-colors group"
                        >
                            {/* Album Art */}
                            <div className="relative w-12 h-12 rounded-lg bg-surface-container-high flex-shrink-0 overflow-hidden">
                                {track.coverArt ? (
                                    <img
                                        src={track.coverArt}
                                        alt={track.album}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <Music size={20} className="text-secondary" />
                                    </div>
                                )}

                                {/* Play overlay */}
                                <button
                                    onClick={() => handlePlayTrack(track)}
                                    disabled={loadingTrackId === track.id}
                                    className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center disabled:cursor-wait"
                                >
                                    {loadingTrackId === track.id ? (
                                        <Loader2 size={20} className="text-white animate-spin" />
                                    ) : (
                                        <Play size={20} className="text-white" />
                                    )}
                                </button>
                            </div>

                            {/* Track Info */}
                            <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{track.title}</p>
                                <p className="text-sm text-secondary truncate">
                                    {track.artist}
                                </p>
                            </div>

                            {/* Source Badge */}
                            <span
                                className={`
                  px-2 py-0.5 rounded-full text-xs font-medium
                  ${track.source === 'local'
                                        ? 'bg-accent-purple/20 text-accent-purple'
                                        : 'bg-primary/20 text-primary'
                                    }
                `}
                            >
                                {track.source === 'local' ? 'Local' : 'Spotify'}
                            </span>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
}
