import type { Track } from '@/types';
import { parseBlob } from 'music-metadata-browser';
import { addTrack, clearLocalTracks } from '@/lib/db/db';

/**
 * Supported audio file extensions
 */
const AUDIO_EXTENSIONS = ['.mp3', '.flac', '.wav', '.m4a', '.ogg', '.opus', '.aac', '.wma'];

/**
 * Check if File System Access API is supported
 */
export function isFileSystemAccessSupported(): boolean {
    return 'showDirectoryPicker' in window;
}

/**
 * File Scanner - Scans directories for audio files
 */
class FileScanner {
    private abortController: AbortController | null = null;

    /**
     * Scan a directory for audio files
     */
    async scanDirectory(
        onProgress?: (current: number, total: number, filename: string) => void
    ): Promise<Track[]> {
        if (!isFileSystemAccessSupported()) {
            throw new Error('File System Access API not supported in this browser');
        }

        try {
            // Let user pick a directory
            const dirHandle = await window.showDirectoryPicker({
                mode: 'read',
            });

            this.abortController = new AbortController();

            // First pass: count files
            const files: { handle: FileSystemFileHandle; path: string }[] = [];
            await this.collectFiles(dirHandle, '', files);

            // Second pass: parse metadata
            const tracks: Track[] = [];

            for (let i = 0; i < files.length; i++) {
                if (this.abortController.signal.aborted) break;

                const { handle, path } = files[i];
                onProgress?.(i + 1, files.length, handle.name);

                try {
                    const track = await this.parseFile(handle, path);
                    if (track) {
                        tracks.push(track);
                        await addTrack(track);
                    }
                } catch (err) {
                    console.warn(`Failed to parse ${handle.name}:`, err);
                }
            }

            return tracks;
        } catch (error) {
            if ((error as Error).name === 'AbortError') {
                return [];
            }
            throw error;
        }
    }

    /**
     * Recursively collect audio files from directory
     */
    private async collectFiles(
        dirHandle: FileSystemDirectoryHandle,
        path: string,
        files: { handle: FileSystemFileHandle; path: string }[]
    ): Promise<void> {
        for await (const entry of dirHandle.values()) {
            const entryPath = path ? `${path}/${entry.name}` : entry.name;

            if (entry.kind === 'directory') {
                await this.collectFiles(entry as FileSystemDirectoryHandle, entryPath, files);
            } else if (entry.kind === 'file') {
                const ext = entry.name.substring(entry.name.lastIndexOf('.')).toLowerCase();
                if (AUDIO_EXTENSIONS.includes(ext)) {
                    files.push({ handle: entry as FileSystemFileHandle, path: entryPath });
                }
            }
        }
    }

    /**
     * Parse audio file metadata
     */
    private async parseFile(
        handle: FileSystemFileHandle,
        _path: string
    ): Promise<Track | null> {
        try {
            const file = await handle.getFile();
            const metadata = await parseBlob(file);

            // Extract cover art
            let coverArt: string | undefined;
            if (metadata.common.picture && metadata.common.picture.length > 0) {
                const picture = metadata.common.picture[0];
                const blob = new Blob([picture.data], { type: picture.format });
                coverArt = URL.createObjectURL(blob);
            }

            return {
                id: crypto.randomUUID(),
                title: metadata.common.title || this.getFilenameWithoutExt(handle.name),
                artist: metadata.common.artist || 'Unknown Artist',
                album: metadata.common.album || 'Unknown Album',
                duration: metadata.format.duration || 0,
                coverArt,
                source: 'local',
                fileHandle: handle,
                bitrate: metadata.format.bitrate,
                format: metadata.format.codec,
                dateAdded: Date.now(),
            };
        } catch (error) {
            console.error(`Error parsing ${handle.name}:`, error);
            return null;
        }
    }

    /**
     * Get filename without extension
     */
    private getFilenameWithoutExt(filename: string): string {
        const lastDot = filename.lastIndexOf('.');
        return lastDot > 0 ? filename.substring(0, lastDot) : filename;
    }

    /**
     * Add files via file input (fallback for browsers without directory picker)
     */
    async addFiles(files: FileList): Promise<Track[]> {
        const tracks: Track[] = [];

        for (const file of Array.from(files)) {
            try {
                const metadata = await parseBlob(file);

                let coverArt: string | undefined;
                if (metadata.common.picture && metadata.common.picture.length > 0) {
                    const picture = metadata.common.picture[0];
                    const blob = new Blob([picture.data], { type: picture.format });
                    coverArt = URL.createObjectURL(blob);
                }

                const track: Track = {
                    id: crypto.randomUUID(),
                    title: metadata.common.title || this.getFilenameWithoutExt(file.name),
                    artist: metadata.common.artist || 'Unknown Artist',
                    album: metadata.common.album || 'Unknown Album',
                    duration: metadata.format.duration || 0,
                    coverArt,
                    source: 'local',
                    bitrate: metadata.format.bitrate,
                    format: metadata.format.codec,
                    dateAdded: Date.now(),
                };

                tracks.push(track);
                await addTrack(track);
            } catch (err) {
                console.warn(`Failed to parse ${file.name}:`, err);
            }
        }

        return tracks;
    }

    /**
     * Clear all local tracks from database
     */
    async clearLibrary(): Promise<void> {
        await clearLocalTracks();
    }

    /**
     * Cancel ongoing scan
     */
    cancelScan(): void {
        this.abortController?.abort();
    }
}

export const fileScanner = new FileScanner();
