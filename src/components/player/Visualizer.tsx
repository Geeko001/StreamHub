import { useEffect, useRef, useCallback } from 'react';
import { audioEngine } from '@/lib/audio/AudioEngine';
import { usePlayerStore } from '@/stores/usePlayerStore';

interface VisualizerProps {
    mini?: boolean;
}

export default function Visualizer({ mini = false }: VisualizerProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number | undefined>(undefined);
    const { isPlaying } = usePlayerStore();

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const frequencyData = audioEngine.getFrequencyData();
        const { width, height } = canvas;

        // Clear canvas
        ctx.clearRect(0, 0, width, height);

        if (mini) {
            // Mini visualizer - 4 bars
            const barCount = 4;
            const barWidth = width / barCount - 2;
            const gap = 2;

            for (let i = 0; i < barCount; i++) {
                // Sample from different parts of frequency spectrum
                const dataIndex = Math.floor((i / barCount) * frequencyData.length * 0.5);
                const value = frequencyData[dataIndex] / 255;
                const barHeight = Math.max(4, value * height * 0.8);

                const x = i * (barWidth + gap);
                const y = height - barHeight;

                // Gradient from primary to accent
                const gradient = ctx.createLinearGradient(x, y, x, height);
                gradient.addColorStop(0, '#1db954');
                gradient.addColorStop(1, '#1ed760');

                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.roundRect(x, y, barWidth, barHeight, 2);
                ctx.fill();
            }
        } else {
            // Full visualizer - frequency bars
            const barCount = 64;
            const barWidth = width / barCount;
            const gap = 1;

            for (let i = 0; i < barCount; i++) {
                const dataIndex = Math.floor((i / barCount) * frequencyData.length);
                const value = frequencyData[dataIndex] / 255;
                const barHeight = Math.max(2, value * height * 0.9);

                const x = i * barWidth;
                const y = height - barHeight;

                // Color based on frequency (low = purple, mid = primary, high = blue)
                const hue = 120 + (i / barCount) * 60; // Green to cyan
                const saturation = 70 + value * 30;
                const lightness = 40 + value * 20;

                const gradient = ctx.createLinearGradient(x, y, x, height);
                gradient.addColorStop(0, `hsl(${hue}, ${saturation}%, ${lightness}%)`);
                gradient.addColorStop(1, `hsl(${hue}, ${saturation}%, ${lightness - 15}%)`);

                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.roundRect(x + gap / 2, y, barWidth - gap, barHeight, 2);
                ctx.fill();
            }
        }

        animationRef.current = requestAnimationFrame(draw);
    }, [mini]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Set canvas size
        const updateSize = () => {
            const rect = canvas.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;

            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.scale(dpr, dpr);
            }
        };

        updateSize();
        window.addEventListener('resize', updateSize);

        return () => {
            window.removeEventListener('resize', updateSize);
        };
    }, []);

    useEffect(() => {
        if (isPlaying) {
            animationRef.current = requestAnimationFrame(draw);
        } else if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
        }

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [isPlaying, draw]);

    return (
        <canvas
            ref={canvasRef}
            className={mini ? 'w-full h-full' : 'w-full h-32'}
            style={{ display: 'block' }}
        />
    );
}
