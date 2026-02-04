import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    FolderOpen,
    Music,
    Play,
    MoreVertical,
    RefreshCw,
    Trash2,
    LogIn,
    LogOut,
} from 'lucide-react';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { fileScanner, isFileSystemAccessSupported } from '@/lib/local/FileScanner';
import { getTracksBySource } from '@/lib/db/db';
import { spotifyService } from '@/lib/services/SpotifyService';
import type { Track, LibraryTab } from '@/types';

export default function LibraryView() {
    const { libraryTab, setLibraryTab, playTrack } = usePlayerStore();
    const [tracks, setTracks] = useState<Track[]>([]);
    const [loading, setLoading] = useState(false);
    const [scanProgress, setScanProgress] = useState<{
        current: number;
        total: number;
        filename: string;
    } | null>(null);

    const isSpotifyConnected = spotifyService.isAuthenticated();

    const tabs: { id: LibraryTab; label: string }[] = [
        { id: 'local', label: 'Local' },
        // { id: 'spotify', label: 'Saved' }, // Disabled in anonymous mode for now
        { id: 'playlists', label: 'Playlists' },
    ];

    // Load tracks when tab changes
    useEffect(() => {
        loadTracks();
    }, [libraryTab]);

    async function loadTracks() {
        setLoading(true);
        try {
            if (libraryTab === 'local') {
                const localTracks = await getTracksBySource('local');
                setTracks(localTracks);
            } else if (libraryTab === 'spotify' && isSpotifyConnected) {
                const savedTracks = await spotifyService.getSavedTracks();
                setTracks(savedTracks);
            } else {
                setTracks([]);
            }
        } catch (err) {
            console.error('Failed to load tracks:', err);
        } finally {
            setLoading(false);
        }
    }

    async function handleScanFolder() {
        setScanProgress({ current: 0, total: 0, filename: '' });

        try {
            const newTracks = await fileScanner.scanDirectory((current, total, filename) => {
                setScanProgress({ current, total, filename });
            });

            setTracks((prev) => [...prev, ...newTracks]);
        } catch (err) {
            if ((err as Error).name !== 'AbortError') {
                console.error('Scan failed:', err);
            }
        } finally {
            setScanProgress(null);
        }
    }

    async function handleClearLibrary() {
        if (confirm('Are you sure you want to clear your local library?')) {
            await fileScanner.clearLibrary();
            setTracks([]);
        }
    }

    function handlePlayTrack(track: Track) {
        playTrack(track, tracks);
    }

    return (
        <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold">Library</h1>

                <div className="flex items-center gap-2">
                    {libraryTab === 'local' && (
                        <>
                            {isFileSystemAccessSupported() && (
                                <button
                                    onClick={handleScanFolder}
                                    disabled={!!scanProgress}
                                    className="p-2 text-secondary hover:text-white transition-colors disabled:opacity-50"
                                    title="Scan folder"
                                >
                                    <FolderOpen size={20} />
                                </button>
                            )}

                            <button
                                onClick={loadTracks}
                                className="p-2 text-secondary hover:text-white transition-colors"
                                title="Refresh"
                            >
                                <RefreshCw size={20} />
                            </button>

                            {tracks.length > 0 && (
                                <button
                                    onClick={handleClearLibrary}
                                    className="p-2 text-secondary hover:text-red-500 transition-colors"
                                    title="Clear library"
                                >
                                    <Trash2 size={20} />
                                </button>
                            )}
                        </>
                    )}

                    {libraryTab === 'spotify' && (
                        <button
                            onClick={() => isSpotifyConnected ? spotifyService.logout() : spotifyService.login()}
                            className="flex items-center gap-2 px-4 py-2 bg-primary/20 text-primary rounded-full hover:bg-primary/30 transition-colors"
                        >
                            {isSpotifyConnected ? (
                                <>
                                    <LogOut size={16} />
                                    <span>Disconnect</span>
                                </>
                            ) : (
                                <>
                                    <LogIn size={16} />
                                    <span>Connect</span>
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setLibraryTab(tab.id)}
                        className={`
              px-4 py-2 rounded-full text-sm font-medium transition-colors
              ${libraryTab === tab.id
                                ? 'bg-primary text-black'
                                : 'bg-surface-container text-secondary hover:text-white'
                            }
            `}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Scan Progress */}
            {scanProgress && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass rounded-xl p-4 mb-6"
                >
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Scanning...</span>
                        <span className="text-sm text-secondary">
                            {scanProgress.current} / {scanProgress.total}
                        </span>
                    </div>
                    <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-primary transition-all duration-300"
                            style={{ width: `${(scanProgress.current / scanProgress.total) * 100}%` }}
                        />
                    </div>
                    <p className="text-xs text-secondary mt-2 truncate">{scanProgress.filename}</p>
                </motion.div>
            )}

            {/* Track List */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
            ) : tracks.length === 0 ? (
                <div className="text-center py-12">
                    <Music size={48} className="mx-auto text-secondary mb-4" />
                    <p className="text-secondary">
                        {libraryTab === 'local'
                            ? 'No local tracks yet. Scan a folder to add music.'
                            : libraryTab === 'spotify' && !isSpotifyConnected
                                ? 'Connect Spotify to see your saved tracks.'
                                : 'No tracks found.'}
                    </p>
                </div>
            ) : (
                <div className="space-y-1">
                    {tracks.map((track, index) => (
                        <motion.div
                            key={track.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: Math.min(index * 0.02, 0.5) }}
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
                                    className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                >
                                    <Play size={20} className="text-white" />
                                </button>
                            </div>

                            {/* Track Info */}
                            <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{track.title}</p>
                                <p className="text-sm text-secondary truncate">
                                    {track.artist} • {track.album}
                                </p>
                            </div>

                            {/* Duration */}
                            <span className="text-sm text-secondary hidden sm:block">
                                {formatDuration(track.duration)}
                            </span>

                            {/* More button */}
                            <button className="p-2 text-secondary hover:text-white transition-colors opacity-0 group-hover:opacity-100">
                                <MoreVertical size={18} />
                            </button>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
}

function formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}
