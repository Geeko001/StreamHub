import { motion } from 'framer-motion';
import {
    Play,
    Pause,
    SkipBack,
    SkipForward,
    Volume2,
    VolumeX,
} from 'lucide-react';
import { usePlayerStore } from '@/stores/usePlayerStore';
import Visualizer from './Visualizer';

function formatTime(seconds: number): string {
    if (!seconds || !isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function PlayerBar() {
    const {
        currentTrack,
        isPlaying,
        progress,
        duration,
        volume,
        muted,
        togglePlayPause,
        next,
        previous,
        seek,
        setVolume,
        toggleMute,
        toggleNowPlaying,
    } = usePlayerStore();

    if (!currentTrack) {
        return null;
    }

    const progressPercent = duration > 0 ? (progress / duration) * 100 : 0;

    return (
        <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            className="fixed bottom-16 md:bottom-0 left-0 right-0 z-30"
        >
            <div className="glass border-t border-white/5">
                {/* Progress Bar */}
                <div className="relative h-1 bg-white/10 cursor-pointer group"
                    onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const percent = (e.clientX - rect.left) / rect.width;
                        seek(percent);
                    }}
                >
                    <motion.div
                        className="absolute h-full bg-primary"
                        style={{ width: `${progressPercent}%` }}
                    />
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div
                            className="absolute h-3 w-3 bg-primary rounded-full -top-1 shadow-glow"
                            style={{ left: `${progressPercent}%`, transform: 'translateX(-50%)' }}
                        />
                    </div>
                </div>

                <div className="flex items-center justify-between px-4 py-3">
                    {/* Track Info */}
                    <button
                        onClick={toggleNowPlaying}
                        className="flex items-center gap-3 flex-1 min-w-0 text-left"
                    >
                        {/* Album Art with Mini Visualizer */}
                        <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-surface-container flex-shrink-0">
                            {currentTrack.coverArt ? (
                                <img
                                    src={currentTrack.coverArt}
                                    alt={currentTrack.album}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <Visualizer mini />
                                </div>
                            )}

                            {isPlaying && currentTrack.coverArt && (
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                    <Visualizer mini />
                                </div>
                            )}
                        </div>

                        <div className="min-w-0">
                            <p className="font-medium truncate">{currentTrack.title}</p>
                            <p className="text-sm text-secondary truncate">{currentTrack.artist}</p>
                        </div>
                    </button>

                    {/* Controls */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={previous}
                            className="p-2 text-secondary hover:text-white transition-colors"
                        >
                            <SkipBack size={20} />
                        </button>

                        <button
                            onClick={togglePlayPause}
                            className="p-3 bg-primary rounded-full hover:bg-primary-dim transition-colors glow-primary"
                        >
                            {isPlaying ? (
                                <Pause size={20} className="text-black" />
                            ) : (
                                <Play size={20} className="text-black ml-0.5" />
                            )}
                        </button>

                        <button
                            onClick={next}
                            className="p-2 text-secondary hover:text-white transition-colors"
                        >
                            <SkipForward size={20} />
                        </button>
                    </div>

                    {/* Time & Volume (Desktop) */}
                    <div className="hidden md:flex items-center gap-4 flex-1 justify-end">
                        <span className="text-sm text-secondary min-w-[80px] text-right">
                            {formatTime(progress)} / {formatTime(duration)}
                        </span>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={toggleMute}
                                className="p-2 text-secondary hover:text-white transition-colors"
                            >
                                {muted || volume === 0 ? (
                                    <VolumeX size={18} />
                                ) : (
                                    <Volume2 size={18} />
                                )}
                            </button>

                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.01"
                                value={muted ? 0 : volume}
                                onChange={(e) => setVolume(parseFloat(e.target.value))}
                                className="w-24"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
