import { Music, Radio, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { usePlayerStore } from '@/stores/usePlayerStore';

export default function HomeView() {
    const { setView } = usePlayerStore();
    // No auth check needed for anonymous mode

    const quickActions = [
        {
            id: 'local',
            icon: Music,
            title: 'Local Library',
            subtitle: 'Your offline collection',
            color: 'from-purple-500 to-pink-500',
            action: () => setView('library'),
        },
        {
            id: 'spotify',
            icon: Sparkles,
            title: 'Stream Music',
            subtitle: 'Search & play instantly',
            color: 'from-green-500 to-emerald-500',
            action: () => setView('search'),
        },
        {
            id: 'discover',
            icon: Radio,
            title: 'Discover',
            subtitle: 'Find new music',
            color: 'from-blue-500 to-cyan-500',
            action: () => setView('search'),
        },
    ];

    return (
        <div className="p-6">
            {/* Header */}
            <div className="mb-8">
                <motion.h1
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-3xl font-bold mb-2"
                >
                    Good {getTimeOfDay()}
                </motion.h1>
                <p className="text-secondary">What would you like to listen to?</p>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {quickActions.map((action, index) => {
                    const Icon = action.icon;

                    return (
                        <motion.button
                            key={action.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            onClick={action.action}
                            className={`
                relative overflow-hidden rounded-2xl p-6 text-left
                bg-gradient-to-br ${action.color}
                hover:scale-[1.02] active:scale-[0.98]
                transition-transform duration-200
              `}
                        >
                            <div className="relative z-10">
                                <Icon size={32} className="mb-4" />
                                <h3 className="text-lg font-semibold">{action.title}</h3>
                                <p className="text-white/80 text-sm">{action.subtitle}</p>
                            </div>

                            {/* Decorative circles */}
                            <div className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full bg-white/10" />
                            <div className="absolute -right-4 -bottom-4 w-20 h-20 rounded-full bg-white/10" />
                        </motion.button>
                    );
                })}
            </div>

            {/* Search Prompt */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="glass rounded-2xl p-6 cursor-pointer hover:bg-white/5 transition-colors"
                onClick={() => setView('search')}
            >
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/20 rounded-full text-primary">
                        <Sparkles size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-semibold mb-1">Start Listening</h2>
                        <p className="text-secondary">
                            Search for any song to stream instantly. No login required.
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

function getTimeOfDay(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    return 'evening';
}
