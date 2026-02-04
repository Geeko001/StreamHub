import { useState } from 'react';
import { motion } from 'framer-motion';
import {
    X,
    Play,
    Pause,
    SkipBack,
    SkipForward,
    Shuffle,
    Repeat,
    Repeat1,
    Heart,
    ListMusic,
    Mic2,
    Volume2,
} from 'lucide-react';
import { usePlayerStore } from '@/stores/usePlayerStore';
import Visualizer from './Visualizer';
import LyricsPanel from './LyricsPanel';

function formatTime(seconds: number): string {
    if (!seconds || !isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function NowPlaying() {
    const {
        currentTrack,
        isPlaying,
        progress,
        duration,
        shuffle,
        repeat,
        showLyrics,
        togglePlayPause,
        next,
        previous,
        seek,
        toggleNowPlaying,
        toggleShuffle,
        cycleRepeat,
        toggleLyrics,
    } = usePlayerStore();

    const [showQueue, setShowQueue] = useState(false);

    if (!currentTrack) return null;

    const progressPercent = duration > 0 ? (progress / duration) * 100 : 0;

    return (
        <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-50 bg-surface flex flex-col"
        >
            {/* Header */}
            <div className="flex items-center justify-between p-4">
                <button
                    onClick={toggleNowPlaying}
                    className="p-2 text-secondary hover:text-white transition-colors"
                >
                    <X size={24} />
                </button>

                <span className="text-sm text-secondary uppercase tracking-wider">
                    Now Playing
                </span>

                <button
                    onClick={() => setShowQueue(!showQueue)}
                    className={`p-2 transition-colors ${showQueue ? 'text-primary' : 'text-secondary hover:text-white'}`}
                >
                    <ListMusic size={24} />
                </button>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col items-center justify-center px-8 pb-8 overflow-hidden">
                {showLyrics ? (
                    <LyricsPanel />
                ) : (
                    <>
                        {/* Album Art */}
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.1 }}
                            className="relative w-full max-w-sm aspect-square rounded-2xl overflow-hidden shadow-2xl mb-8"
                        >
                            {currentTrack.coverArt ? (
                                <img
                                    src={currentTrack.coverArt}
                                    alt={currentTrack.album}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full bg-surface-container flex items-center justify-center">
                                    <Visualizer />
                                </div>
                            )}

                            {/* Overlay Visualizer */}
                            {isPlaying && currentTrack.coverArt && (
                                <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/80 to-transparent flex items-end p-4">
                                    <Visualizer />
                                </div>
                            )}
                        </motion.div>

                        {/* Track Info */}
                        <div className="text-center mb-8 w-full max-w-sm">
                            <h2 className="text-2xl font-bold mb-2 truncate">{currentTrack.title}</h2>
                            <p className="text-secondary truncate">{currentTrack.artist}</p>
                        </div>
                    </>
                )}

                {/* Progress Bar */}
                <div className="w-full max-w-sm mb-6">
                    <div
                        className="relative h-1 bg-white/10 rounded-full cursor-pointer"
                        onClick={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const percent = (e.clientX - rect.left) / rect.width;
                            seek(percent);
                        }}
                    >
                        <motion.div
                            className="absolute h-full bg-primary rounded-full"
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>

                    <div className="flex justify-between mt-2 text-sm text-secondary">
                        <span>{formatTime(progress)}</span>
                        <span>{formatTime(duration)}</span>
                    </div>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-center gap-6 mb-8">
                    <button
                        onClick={toggleShuffle}
                        className={`p-2 transition-colors ${shuffle ? 'text-primary' : 'text-secondary hover:text-white'}`}
                    >
                        <Shuffle size={22} />
                    </button>

                    <button
                        onClick={previous}
                        className="p-3 text-white hover:text-primary transition-colors"
                    >
                        <SkipBack size={28} fill="currentColor" />
                    </button>

                    <button
                        onClick={togglePlayPause}
                        className="p-5 bg-primary rounded-full hover:bg-primary-dim transition-colors glow-primary"
                    >
                        {isPlaying ? (
                            <Pause size={32} className="text-black" />
                        ) : (
                            <Play size={32} className="text-black ml-1" />
                        )}
                    </button>

                    <button
                        onClick={next}
                        className="p-3 text-white hover:text-primary transition-colors"
                    >
                        <SkipForward size={28} fill="currentColor" />
                    </button>

                    <button
                        onClick={cycleRepeat}
                        className={`p-2 transition-colors ${repeat !== 'off' ? 'text-primary' : 'text-secondary hover:text-white'}`}
                    >
                        {repeat === 'one' ? <Repeat1 size={22} /> : <Repeat size={22} />}
                    </button>
                </div>

                {/* Extra Actions */}
                <div className="flex items-center justify-center gap-8">
                    <button className="p-2 text-secondary hover:text-white transition-colors">
                        <Heart size={22} />
                    </button>

                    <button
                        onClick={toggleLyrics}
                        className={`p-2 transition-colors ${showLyrics ? 'text-primary' : 'text-secondary hover:text-white'}`}
                    >
                        <Mic2 size={22} />
                    </button>

                    <button className="p-2 text-secondary hover:text-white transition-colors">
                        <Volume2 size={22} />
                    </button>
                </div>
            </div>
        </motion.div>
    );
}
