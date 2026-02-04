import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Track, RepeatMode, ViewType, LibraryTab } from '@/types';
import { audioEngine, EQ_PRESETS } from '@/lib/audio/AudioEngine';

interface PlayerState {
    // Playback state
    currentTrack: Track | null;
    isPlaying: boolean;
    progress: number;
    duration: number;
    volume: number;
    muted: boolean;

    // Queue
    queue: Track[];
    queueIndex: number;
    shuffle: boolean;
    repeat: RepeatMode;

    // EQ
    eqEnabled: boolean;
    eqBands: number[];
    eqPresetName: string;

    // UI state
    currentView: ViewType;
    libraryTab: LibraryTab;
    showNowPlaying: boolean;
    showLyrics: boolean;

    // Actions
    setTrack: (track: Track) => Promise<void>;
    playTrack: (track: Track, queue?: Track[]) => Promise<void>;
    togglePlayPause: () => Promise<void>;
    play: () => Promise<void>;
    pause: () => void;
    next: () => Promise<void>;
    previous: () => Promise<void>;
    seek: (position: number) => void;
    setVolume: (volume: number) => void;
    toggleMute: () => void;
    toggleShuffle: () => void;
    cycleRepeat: () => void;

    // EQ actions
    setEQBand: (index: number, gain: number) => void;
    setEQBands: (gains: number[]) => void;
    applyEQPreset: (presetName: string) => void;
    toggleEQ: () => void;

    // Queue actions
    addToQueue: (track: Track) => void;
    removeFromQueue: (index: number) => void;
    clearQueue: () => void;
    reorderQueue: (fromIndex: number, toIndex: number) => void;

    // UI actions
    setView: (view: ViewType) => void;
    setLibraryTab: (tab: LibraryTab) => void;
    toggleNowPlaying: () => void;
    toggleLyrics: () => void;

    // Internal
    updateProgress: (progress: number, duration: number) => void;
    setIsPlaying: (isPlaying: boolean) => void;
}

export const usePlayerStore = create<PlayerState>()(
    persist(
        (set, get) => ({
            // Initial state
            currentTrack: null,
            isPlaying: false,
            progress: 0,
            duration: 0,
            volume: 0.8,
            muted: false,

            queue: [],
            queueIndex: -1,
            shuffle: false,
            repeat: 'off',

            eqEnabled: true,
            eqBands: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            eqPresetName: 'Flat',

            currentView: 'home',
            libraryTab: 'local',
            showNowPlaying: false,
            showLyrics: false,

            // Playback actions
            setTrack: async (track: Track) => {
                set({ currentTrack: track });
                audioEngine.setCurrentTrack(track);

                if (track.source === 'local' && track.fileHandle) {
                    const file = await track.fileHandle.getFile();
                    await audioEngine.loadFile(file);
                } else if (track.streamUrl) {
                    await audioEngine.loadStream(track.streamUrl);
                }
            },

            playTrack: async (track: Track, queue?: Track[]) => {
                const state = get();

                if (queue) {
                    const index = queue.findIndex((t) => t.id === track.id);
                    set({
                        queue,
                        queueIndex: index >= 0 ? index : 0,
                    });
                }

                await state.setTrack(track);
                await audioEngine.play();
                set({ isPlaying: true });
            },

            togglePlayPause: async () => {
                const state = get();
                if (state.isPlaying) {
                    audioEngine.pause();
                    set({ isPlaying: false });
                } else {
                    await audioEngine.play();
                    set({ isPlaying: true });
                }
            },

            play: async () => {
                await audioEngine.play();
                set({ isPlaying: true });
            },

            pause: () => {
                audioEngine.pause();
                set({ isPlaying: false });
            },

            next: async () => {
                const state = get();
                const { queue, queueIndex, repeat, shuffle } = state;

                if (queue.length === 0) return;

                let nextIndex: number;

                if (shuffle) {
                    nextIndex = Math.floor(Math.random() * queue.length);
                } else {
                    nextIndex = queueIndex + 1;

                    if (nextIndex >= queue.length) {
                        if (repeat === 'all') {
                            nextIndex = 0;
                        } else {
                            return; // End of queue
                        }
                    }
                }

                const nextTrack = queue[nextIndex];
                if (nextTrack) {
                    set({ queueIndex: nextIndex });
                    await state.playTrack(nextTrack);
                }
            },

            previous: async () => {
                const state = get();
                const { queue, queueIndex, progress } = state;

                // If more than 3 seconds in, restart current track
                if (progress > 3) {
                    audioEngine.seekTo(0);
                    return;
                }

                if (queue.length === 0) return;

                const prevIndex = queueIndex > 0 ? queueIndex - 1 : queue.length - 1;
                const prevTrack = queue[prevIndex];

                if (prevTrack) {
                    set({ queueIndex: prevIndex });
                    await state.playTrack(prevTrack);
                }
            },

            seek: (position: number) => {
                audioEngine.seek(position);
            },

            setVolume: (volume: number) => {
                audioEngine.setVolume(volume);
                set({ volume, muted: false });
            },

            toggleMute: () => {
                const state = get();
                if (state.muted) {
                    audioEngine.setVolume(state.volume);
                    set({ muted: false });
                } else {
                    audioEngine.setVolume(0);
                    set({ muted: true });
                }
            },

            toggleShuffle: () => {
                set((state) => ({ shuffle: !state.shuffle }));
            },

            cycleRepeat: () => {
                set((state) => {
                    const modes: RepeatMode[] = ['off', 'all', 'one'];
                    const currentIndex = modes.indexOf(state.repeat);
                    const nextIndex = (currentIndex + 1) % modes.length;
                    return { repeat: modes[nextIndex] };
                });
            },

            // EQ actions
            setEQBand: (index: number, gain: number) => {
                audioEngine.setEQBand(index, gain);
                set((state) => {
                    const newBands = [...state.eqBands];
                    newBands[index] = gain;
                    return { eqBands: newBands, eqPresetName: 'Custom' };
                });
            },

            setEQBands: (gains: number[]) => {
                audioEngine.setEQBands(gains);
                set({ eqBands: gains });
            },

            applyEQPreset: (presetName: string) => {
                const preset = EQ_PRESETS.find((p) => p.name === presetName);
                if (preset) {
                    audioEngine.applyPreset(preset);
                    set({ eqBands: [...preset.bands], eqPresetName: presetName });
                }
            },

            toggleEQ: () => {
                const newEnabled = !get().eqEnabled;
                audioEngine.setEQEnabled(newEnabled);
                set({ eqEnabled: newEnabled });

                // Restore EQ bands if re-enabling
                if (newEnabled) {
                    audioEngine.setEQBands(get().eqBands);
                }
            },

            // Queue actions
            addToQueue: (track: Track) => {
                set((state) => ({ queue: [...state.queue, track] }));
            },

            removeFromQueue: (index: number) => {
                set((state) => {
                    const newQueue = state.queue.filter((_, i) => i !== index);
                    let newIndex = state.queueIndex;

                    if (index < state.queueIndex) {
                        newIndex--;
                    } else if (index === state.queueIndex && newIndex >= newQueue.length) {
                        newIndex = newQueue.length - 1;
                    }

                    return { queue: newQueue, queueIndex: newIndex };
                });
            },

            clearQueue: () => {
                set({ queue: [], queueIndex: -1 });
            },

            reorderQueue: (fromIndex: number, toIndex: number) => {
                set((state) => {
                    const newQueue = [...state.queue];
                    const [removed] = newQueue.splice(fromIndex, 1);
                    newQueue.splice(toIndex, 0, removed);

                    let newIndex = state.queueIndex;
                    if (state.queueIndex === fromIndex) {
                        newIndex = toIndex;
                    } else if (fromIndex < state.queueIndex && toIndex >= state.queueIndex) {
                        newIndex--;
                    } else if (fromIndex > state.queueIndex && toIndex <= state.queueIndex) {
                        newIndex++;
                    }

                    return { queue: newQueue, queueIndex: newIndex };
                });
            },

            // UI actions
            setView: (view: ViewType) => {
                set({ currentView: view });
            },

            setLibraryTab: (tab: LibraryTab) => {
                set({ libraryTab: tab });
            },

            toggleNowPlaying: () => {
                set((state) => ({ showNowPlaying: !state.showNowPlaying }));
            },

            toggleLyrics: () => {
                set((state) => ({ showLyrics: !state.showLyrics }));
            },

            // Internal
            updateProgress: (progress: number, duration: number) => {
                set({ progress, duration });
            },

            setIsPlaying: (isPlaying: boolean) => {
                set({ isPlaying });
            },
        }),
        {
            name: 'streamix-player',
            partialize: (state) => ({
                volume: state.volume,
                shuffle: state.shuffle,
                repeat: state.repeat,
                eqEnabled: state.eqEnabled,
                eqBands: state.eqBands,
                eqPresetName: state.eqPresetName,
            }),
        }
    )
);

// Setup audio engine event listeners
audioEngine.on('timeupdate', (data) => {
    const { currentTime, duration } = data as { currentTime: number; duration: number };
    usePlayerStore.getState().updateProgress(currentTime, duration);
});

audioEngine.on('ended', () => {
    const state = usePlayerStore.getState();

    if (state.repeat === 'one') {
        audioEngine.seekTo(0);
        audioEngine.play();
    } else {
        state.next();
    }
});
