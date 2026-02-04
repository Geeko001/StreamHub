import { motion } from 'framer-motion';
import { Sliders, RotateCcw } from 'lucide-react';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { EQ_PRESETS, EQ_FREQUENCIES } from '@/lib/audio/AudioEngine';

export default function SettingsView() {
    const {
        eqEnabled,
        eqBands,
        eqPresetName,
        volume,
        toggleEQ,
        setEQBand,
        applyEQPreset,
        setVolume,
    } = usePlayerStore();

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6">Settings</h1>

            {/* Equalizer Section */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass rounded-2xl p-6 mb-6"
            >
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <Sliders size={24} className="text-primary" />
                        <h2 className="text-lg font-semibold">Equalizer</h2>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Reset Button */}
                        <button
                            onClick={() => applyEQPreset('Flat')}
                            className="p-2 text-secondary hover:text-white transition-colors"
                            title="Reset to flat"
                        >
                            <RotateCcw size={18} />
                        </button>

                        {/* Toggle */}
                        <button
                            onClick={toggleEQ}
                            className={`
                relative w-12 h-6 rounded-full transition-colors
                ${eqEnabled ? 'bg-primary' : 'bg-surface-container-high'}
              `}
                        >
                            <motion.div
                                animate={{ x: eqEnabled ? 24 : 2 }}
                                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                className="absolute top-1 w-4 h-4 bg-white rounded-full"
                            />
                        </button>
                    </div>
                </div>

                {/* Presets */}
                <div className="flex flex-wrap gap-2 mb-6">
                    {EQ_PRESETS.map((preset) => (
                        <button
                            key={preset.name}
                            onClick={() => applyEQPreset(preset.name)}
                            className={`
                px-3 py-1.5 rounded-full text-sm font-medium transition-colors
                ${eqPresetName === preset.name
                                    ? 'bg-primary text-black'
                                    : 'bg-surface-container text-secondary hover:text-white'
                                }
              `}
                        >
                            {preset.name}
                        </button>
                    ))}
                </div>

                {/* EQ Bands */}
                <div className="flex justify-between gap-2">
                    {eqBands.map((gain, index) => (
                        <div key={index} className="flex flex-col items-center gap-2">
                            {/* Slider */}
                            <div className="relative h-32">
                                <input
                                    type="range"
                                    min="-12"
                                    max="12"
                                    step="0.5"
                                    value={gain}
                                    onChange={(e) => setEQBand(index, parseFloat(e.target.value))}
                                    disabled={!eqEnabled}
                                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-32 -rotate-90 origin-center disabled:opacity-50"
                                />
                            </div>

                            {/* Label */}
                            <span className="text-xs text-secondary">
                                {formatFrequency(EQ_FREQUENCIES[index])}
                            </span>

                            {/* Value */}
                            <span className="text-xs font-medium text-primary">
                                {gain > 0 ? `+${gain.toFixed(1)}` : gain.toFixed(1)}
                            </span>
                        </div>
                    ))}
                </div>
            </motion.div>

            {/* Volume Section */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="glass rounded-2xl p-6 mb-6"
            >
                <h2 className="text-lg font-semibold mb-4">Volume</h2>

                <div className="flex items-center gap-4">
                    <span className="text-secondary w-8">0%</span>
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={volume}
                        onChange={(e) => setVolume(parseFloat(e.target.value))}
                        className="flex-1"
                    />
                    <span className="text-secondary w-12 text-right">
                        {Math.round(volume * 100)}%
                    </span>
                </div>
            </motion.div>

            {/* About Section */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="glass rounded-2xl p-6"
            >
                <h2 className="text-lg font-semibold mb-4">About</h2>

                <div className="space-y-3 text-sm text-secondary">
                    <p>
                        <strong className="text-white">Streamix</strong> v1.0.0
                    </p>
                    <p>
                        A high-fidelity hybrid music player with 10-band parametric EQ.
                        Play local lossless files or stream from Spotify.
                    </p>
                    <p className="text-xs">
                        Built with React, Web Audio API, and ❤️
                    </p>
                </div>
            </motion.div>
        </div>
    );
}

function formatFrequency(freq: number): string {
    if (freq >= 1000) {
        return `${freq / 1000}k`;
    }
    return String(freq);
}
