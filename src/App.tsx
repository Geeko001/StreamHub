import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Search, Library, Settings } from 'lucide-react';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { audioEngine } from '@/lib/audio/AudioEngine';
import PlayerBar from '@/components/player/PlayerBar';
import NowPlaying from '@/components/player/NowPlaying';
import HomeView from '@/components/home/HomeView';
import LibraryView from '@/components/library/LibraryView';
import SearchView from '@/components/search/SearchView';
import SettingsView from '@/components/settings/SettingsView';
import type { ViewType } from '@/types';

const navItems: { id: ViewType; icon: typeof Home; label: string }[] = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'search', icon: Search, label: 'Search' },
    { id: 'library', icon: Library, label: 'Library' },
    { id: 'settings', icon: Settings, label: 'Settings' },
];

function App() {
    const { currentView, setView, showNowPlaying, currentTrack } = usePlayerStore();
    const [isInitialized, setIsInitialized] = useState(false);

    // Initialize audio engine on first interaction
    useEffect(() => {
        const initAudio = async () => {
            try {
                await audioEngine.initialize();
                setIsInitialized(true);
            } catch (err) {
                console.error('Failed to initialize audio:', err);
            }
        };

        // Initialize on first user interaction
        const handleInteraction = () => {
            if (!isInitialized) {
                initAudio();
            }
        };

        window.addEventListener('click', handleInteraction, { once: true });
        window.addEventListener('touchstart', handleInteraction, { once: true });

        return () => {
            window.removeEventListener('click', handleInteraction);
            window.removeEventListener('touchstart', handleInteraction);
        };
    }, [isInitialized]);



    const renderView = () => {
        switch (currentView) {
            case 'home':
                return <HomeView />;
            case 'search':
                return <SearchView />;
            case 'library':
                return <LibraryView />;
            case 'settings':
                return <SettingsView />;
            default:
                return <HomeView />;
        }
    };

    return (
        <div className="flex flex-col h-full bg-surface overflow-hidden">
            {/* Main Content */}
            <div className="flex flex-1 overflow-hidden">
                {/* Desktop Sidebar */}
                <aside className="hidden md:flex flex-col w-64 bg-surface-dim border-r border-white/5">
                    <div className="p-6">
                        <h1 className="text-2xl font-bold text-gradient">Streamix</h1>
                    </div>

                    <nav className="flex-1 px-3">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = currentView === item.id;

                            return (
                                <button
                                    key={item.id}
                                    onClick={() => setView(item.id)}
                                    className={`
                    w-full flex items-center gap-4 px-4 py-3 rounded-xl mb-1
                    transition-all duration-200
                    ${isActive
                                            ? 'bg-primary/20 text-primary'
                                            : 'text-secondary hover:bg-white/5 hover:text-white'
                                        }
                  `}
                                >
                                    <Icon size={22} />
                                    <span className="font-medium">{item.label}</span>
                                </button>
                            );
                        })}
                    </nav>
                </aside>

                {/* Content Area */}
                <main className="flex-1 overflow-y-auto pb-32 md:pb-24">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentView}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                            className="h-full"
                        >
                            {renderView()}
                        </motion.div>
                    </AnimatePresence>
                </main>
            </div>

            {/* Player Bar */}
            <PlayerBar />

            {/* Mobile Navigation */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 glass safe-bottom z-40">
                <div className="flex justify-around py-2">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = currentView === item.id;

                        return (
                            <button
                                key={item.id}
                                onClick={() => setView(item.id)}
                                className={`
                  flex flex-col items-center gap-1 px-4 py-2 rounded-xl
                  transition-all duration-200
                  ${isActive ? 'text-primary' : 'text-secondary'}
                `}
                            >
                                <Icon size={22} />
                                <span className="text-xs">{item.label}</span>
                            </button>
                        );
                    })}
                </div>
            </nav>

            {/* Now Playing Overlay */}
            <AnimatePresence>
                {showNowPlaying && currentTrack && (
                    <NowPlaying />
                )}
            </AnimatePresence>
        </div>
    );
}

export default App;
