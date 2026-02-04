import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { lyricsService } from '@/lib/services/LyricsService';
import type { Lyrics } from '@/types';

export default function LyricsPanel() {
    const { currentTrack, progress } = usePlayerStore();
    const [lyrics, setLyrics] = useState<Lyrics | null>(null);
    const [loading, setLoading] = useState(false);
    const [currentLineIndex, setCurrentLineIndex] = useState(-1);
    const containerRef = useRef<HTMLDivElement>(null);

    // Fetch lyrics when track changes
    useEffect(() => {
        if (!currentTrack) {
            setLyrics(null);
            return;
        }

        setLoading(true);
        setLyrics(null);

        lyricsService
            .getLyrics(currentTrack.title, currentTrack.artist, currentTrack.album, currentTrack.duration)
            .then((result) => {
                setLyrics(result);
            })
            .finally(() => {
                setLoading(false);
            });
    }, [currentTrack?.id]);

    // Update current line based on progress
    useEffect(() => {
        if (!lyrics?.synced) return;

        const index = lyricsService.getCurrentLine(lyrics, progress);
        setCurrentLineIndex(index);
    }, [lyrics, progress]);

    // Auto-scroll to current line
    useEffect(() => {
        if (!containerRef.current || currentLineIndex < 0) return;

        const container = containerRef.current;
        const lineElement = container.querySelector(`[data-line="${currentLineIndex}"]`);

        if (lineElement) {
            lineElement.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
            });
        }
    }, [currentLineIndex]);

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!lyrics) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <p className="text-secondary text-center">
                    No lyrics available for this track
                </p>
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            className="flex-1 w-full max-w-lg overflow-y-auto scrollbar-hide px-4"
        >
            <div className="py-16 space-y-4">
                {lyrics.lines.map((line, index) => (
                    <motion.p
                        key={index}
                        data-line={index}
                        initial={{ opacity: 0.4 }}
                        animate={{
                            opacity: currentLineIndex === index ? 1 : 0.4,
                            scale: currentLineIndex === index ? 1.05 : 1,
                        }}
                        transition={{ duration: 0.3 }}
                        className={`
              text-center text-xl font-medium transition-colors duration-300
              ${currentLineIndex === index ? 'text-primary' : 'text-white'}
            `}
                    >
                        {line.text}
                    </motion.p>
                ))}
            </div>
        </div>
    );
}
