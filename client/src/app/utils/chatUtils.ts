export const getMediaType = (url: string, fileType?: string) => {
    // Check file_type from database first
    if (fileType) {
        if (fileType.startsWith('video/')) return 'video';
        if (fileType.startsWith('audio/')) return 'audio';
        if (fileType.startsWith('image/')) return 'image';
    }

    // Fallback to URL-based detection
    if (/voice_\d+/i.test(url) || /\baudio\b/i.test(url)) return 'audio';
    if (/video_circle_\d+/i.test(url)) return 'video';
    if (url.match(/\.(mp4|mov|avi|mkv|flv|wmv)$/i)) return 'video';
    if (url.match(/\.(mp3|ogg|wav|m4a)$/i)) return 'audio';
    if (url.match(/\.(webm)$/i)) {
        // WebM can be video or audio, check URL for hints
        if (url.includes('video') || url.includes('circle')) return 'video';
        if (url.includes('voice') || url.includes('audio')) return 'audio';
        return 'video'; // Default to video for webm
    }
    return 'image';
};

export const formatDateHeader = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();

    if (date.toDateString() === today) return 'Сегодня';
    if (date.toDateString() === yesterday) return 'Вчера';
    return date.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    });
};

export const isVoiceUrl = (url: string) => /voice_\d+/i.test(url) || /\baudio\b/i.test(url);
export const isVideoCircleUrl = (url: string) => /video_circle_\d+/i.test(url);
