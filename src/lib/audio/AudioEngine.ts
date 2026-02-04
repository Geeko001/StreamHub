import type { Track, EQPreset } from '@/types';

// EQ frequency bands (Hz)
const EQ_FREQUENCIES = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];

// Default EQ presets
export const EQ_PRESETS: EQPreset[] = [
    { name: 'Flat', bands: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
    { name: 'Bass Boost', bands: [6, 5, 4, 2, 0, 0, 0, 0, 0, 0] },
    { name: 'Treble Boost', bands: [0, 0, 0, 0, 0, 1, 2, 4, 5, 6] },
    { name: 'Vocal', bands: [-2, -1, 0, 2, 4, 4, 3, 1, 0, -1] },
    { name: 'Electronic', bands: [4, 3, 0, -2, -1, 1, 0, 3, 4, 4] },
    { name: 'Rock', bands: [4, 3, 1, 0, -1, 0, 1, 3, 4, 4] },
    { name: 'Pop', bands: [-1, 1, 3, 4, 3, 1, 0, 1, 2, 2] },
    { name: 'Jazz', bands: [2, 1, 0, 1, 2, 3, 3, 2, 2, 2] },
    { name: 'Classical', bands: [3, 2, 1, 1, 0, 0, 0, 1, 2, 3] },
    { name: 'Hip Hop', bands: [5, 4, 2, 1, 0, 0, 1, 0, 2, 2] },
];

type AudioEngineEventType = 'timeupdate' | 'ended' | 'loading' | 'loaded' | 'error';
type AudioEngineEventCallback = (data?: unknown) => void;

/**
 * Singleton Audio Engine using Web Audio API
 * Manages audio playback with 10-band parametric EQ and visualizer support
 */
class AudioEngine {
    private static instance: AudioEngine;

    private audioContext: AudioContext | null = null;
    private sourceNode: MediaElementAudioSourceNode | null = null;
    private audioElement: HTMLAudioElement | null = null;
    private eqNodes: BiquadFilterNode[] = [];
    private analyserNode: AnalyserNode | null = null;
    private gainNode: GainNode | null = null;

    private currentTrack: Track | null = null;
    private isInitialized = false;
    private eventListeners: Map<AudioEngineEventType, Set<AudioEngineEventCallback>> = new Map();

    private constructor() {
        // Private constructor for singleton
    }

    static getInstance(): AudioEngine {
        if (!AudioEngine.instance) {
            AudioEngine.instance = new AudioEngine();
        }
        return AudioEngine.instance;
    }

    /**
     * Initialize the audio context (must be called from user gesture)
     */
    async initialize(): Promise<void> {
        if (this.isInitialized) return;

        try {
            // Create audio context
            this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();

            // Create audio element for streaming support
            this.audioElement = new Audio();
            this.audioElement.crossOrigin = 'anonymous';
            this.audioElement.preload = 'auto';

            // Create source from audio element
            this.sourceNode = this.audioContext.createMediaElementSource(this.audioElement);

            // Create gain node for volume control
            this.gainNode = this.audioContext.createGain();

            // Create analyser node for visualizations
            this.analyserNode = this.audioContext.createAnalyser();
            this.analyserNode.fftSize = 256;
            this.analyserNode.smoothingTimeConstant = 0.8;

            // Create EQ nodes (10-band parametric EQ)
            this.eqNodes = EQ_FREQUENCIES.map((freq, index) => {
                const filter = this.audioContext!.createBiquadFilter();

                // Use peaking filter for mid frequencies, lowshelf/highshelf for extremes
                if (index === 0) {
                    filter.type = 'lowshelf';
                } else if (index === EQ_FREQUENCIES.length - 1) {
                    filter.type = 'highshelf';
                } else {
                    filter.type = 'peaking';
                    filter.Q.value = 1.4; // Moderate Q for musical sound
                }

                filter.frequency.value = freq;
                filter.gain.value = 0; // Flat by default

                return filter;
            });

            // Connect audio graph: source -> EQ chain -> analyser -> gain -> destination
            let lastNode: AudioNode = this.sourceNode;

            for (const eqNode of this.eqNodes) {
                lastNode.connect(eqNode);
                lastNode = eqNode;
            }

            lastNode.connect(this.analyserNode);
            this.analyserNode.connect(this.gainNode);
            this.gainNode.connect(this.audioContext.destination);

            // Setup audio element event listeners
            this.setupEventListeners();

            this.isInitialized = true;
            console.log('[AudioEngine] Initialized successfully');
        } catch (error) {
            console.error('[AudioEngine] Failed to initialize:', error);
            this.emit('error', error);
            throw error;
        }
    }

    private setupEventListeners(): void {
        if (!this.audioElement) return;

        this.audioElement.addEventListener('timeupdate', () => {
            this.emit('timeupdate', {
                currentTime: this.audioElement!.currentTime,
                duration: this.audioElement!.duration || 0,
            });
        });

        this.audioElement.addEventListener('ended', () => {
            this.emit('ended');
        });

        this.audioElement.addEventListener('loadstart', () => {
            this.emit('loading');
        });

        this.audioElement.addEventListener('canplay', () => {
            this.emit('loaded');
        });

        this.audioElement.addEventListener('error', (e) => {
            this.emit('error', e);
        });
    }

    /**
     * Load a local file
     */
    async loadFile(file: File): Promise<void> {
        await this.ensureInitialized();

        const url = URL.createObjectURL(file);
        await this.loadSource(url);
    }

    /**
     * Load a stream URL
     */
    async loadStream(url: string): Promise<void> {
        await this.ensureInitialized();
        await this.loadSource(url);
    }

    private async loadSource(url: string): Promise<void> {
        if (!this.audioElement) throw new Error('Audio engine not initialized');

        // Revoke previous URL if it was a blob
        if (this.audioElement.src.startsWith('blob:')) {
            URL.revokeObjectURL(this.audioElement.src);
        }

        this.audioElement.src = url;
        await this.audioElement.load();
    }

    private async ensureInitialized(): Promise<void> {
        if (!this.isInitialized) {
            await this.initialize();
        }

        // Resume context if suspended
        if (this.audioContext?.state === 'suspended') {
            await this.audioContext.resume();
        }
    }

    /**
     * Play current audio
     */
    async play(): Promise<void> {
        await this.ensureInitialized();

        if (this.audioElement) {
            await this.audioElement.play();
            this.updateMediaSession();
        }
    }

    /**
     * Pause current audio
     */
    pause(): void {
        this.audioElement?.pause();
    }

    /**
     * Toggle play/pause
     */
    async togglePlayPause(): Promise<void> {
        if (this.audioElement?.paused) {
            await this.play();
        } else {
            this.pause();
        }
    }

    /**
     * Seek to position (0-1)
     */
    seek(position: number): void {
        if (this.audioElement && this.audioElement.duration) {
            this.audioElement.currentTime = position * this.audioElement.duration;
        }
    }

    /**
     * Seek to specific time in seconds
     */
    seekTo(time: number): void {
        if (this.audioElement) {
            this.audioElement.currentTime = Math.max(0, Math.min(time, this.audioElement.duration || 0));
        }
    }

    /**
     * Set volume (0-1)
     */
    setVolume(volume: number): void {
        if (this.gainNode) {
            this.gainNode.gain.value = Math.max(0, Math.min(1, volume));
        }
    }

    /**
     * Set EQ band gain (-12 to +12 dB)
     */
    setEQBand(index: number, gain: number): void {
        if (index >= 0 && index < this.eqNodes.length) {
            const clampedGain = Math.max(-12, Math.min(12, gain));
            this.eqNodes[index].gain.value = clampedGain;
        }
    }

    /**
     * Set all EQ bands at once
     */
    setEQBands(gains: number[]): void {
        gains.forEach((gain, index) => {
            this.setEQBand(index, gain);
        });
    }

    /**
     * Apply EQ preset
     */
    applyPreset(preset: EQPreset): void {
        this.setEQBands(preset.bands);
    }

    /**
     * Enable/disable EQ (bypass)
     */
    setEQEnabled(enabled: boolean): void {
        this.eqNodes.forEach((node) => {
            // When disabled, set all gains to 0
            if (!enabled) {
                node.gain.value = 0;
            }
        });
    }

    /**
     * Get frequency data for visualizer
     */
    getFrequencyData(): Uint8Array {
        if (!this.analyserNode) {
            return new Uint8Array(128);
        }

        const dataArray = new Uint8Array(this.analyserNode.frequencyBinCount);
        this.analyserNode.getByteFrequencyData(dataArray);
        return dataArray;
    }

    /**
     * Get time domain data for waveform visualizer
     */
    getTimeDomainData(): Uint8Array {
        if (!this.analyserNode) {
            return new Uint8Array(128);
        }

        const dataArray = new Uint8Array(this.analyserNode.frequencyBinCount);
        this.analyserNode.getByteTimeDomainData(dataArray);
        return dataArray;
    }

    /**
     * Get current playback info
     */
    getPlaybackInfo(): { currentTime: number; duration: number; isPlaying: boolean } {
        return {
            currentTime: this.audioElement?.currentTime || 0,
            duration: this.audioElement?.duration || 0,
            isPlaying: !this.audioElement?.paused,
        };
    }

    /**
     * Set current track metadata
     */
    setCurrentTrack(track: Track): void {
        this.currentTrack = track;
        this.updateMediaSession();
    }

    /**
     * Update Media Session API for system controls
     */
    private updateMediaSession(): void {
        if (!('mediaSession' in navigator) || !this.currentTrack) return;

        navigator.mediaSession.metadata = new MediaMetadata({
            title: this.currentTrack.title,
            artist: this.currentTrack.artist,
            album: this.currentTrack.album,
            artwork: this.currentTrack.coverArt
                ? [{ src: this.currentTrack.coverArt, sizes: '512x512', type: 'image/png' }]
                : [],
        });

        navigator.mediaSession.setActionHandler('play', () => this.play());
        navigator.mediaSession.setActionHandler('pause', () => this.pause());
        navigator.mediaSession.setActionHandler('seekbackward', () => {
            this.seekTo((this.audioElement?.currentTime || 0) - 10);
        });
        navigator.mediaSession.setActionHandler('seekforward', () => {
            this.seekTo((this.audioElement?.currentTime || 0) + 10);
        });
    }

    /**
     * Event handling
     */
    on(event: AudioEngineEventType, callback: AudioEngineEventCallback): void {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, new Set());
        }
        this.eventListeners.get(event)!.add(callback);
    }

    off(event: AudioEngineEventType, callback: AudioEngineEventCallback): void {
        this.eventListeners.get(event)?.delete(callback);
    }

    private emit(event: AudioEngineEventType, data?: unknown): void {
        this.eventListeners.get(event)?.forEach((callback) => callback(data));
    }

    /**
     * Cleanup
     */
    destroy(): void {
        this.audioElement?.pause();

        if (this.audioElement?.src.startsWith('blob:')) {
            URL.revokeObjectURL(this.audioElement.src);
        }

        this.audioContext?.close();

        this.audioElement = null;
        this.audioContext = null;
        this.sourceNode = null;
        this.eqNodes = [];
        this.analyserNode = null;
        this.gainNode = null;
        this.isInitialized = false;
        this.eventListeners.clear();
    }
}

// Export singleton instance
export const audioEngine = AudioEngine.getInstance();
export { EQ_FREQUENCIES };
