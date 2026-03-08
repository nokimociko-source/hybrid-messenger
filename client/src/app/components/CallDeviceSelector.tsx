import React from 'react';
import { Icon, Icons } from 'folds';
import { MediaDevice } from '../hooks/useSupabaseCall';

interface CallDeviceSelectorProps {
    audioDevices: MediaDevice[];
    videoDevices: MediaDevice[];
    selectedAudioDevice: string;
    selectedVideoDevice: string;
    onAudioDeviceChange: (deviceId: string) => void;
    onVideoDeviceChange: (deviceId: string) => void;
    showVideo?: boolean;
}

export function CallDeviceSelector({
    audioDevices,
    videoDevices,
    selectedAudioDevice,
    selectedVideoDevice,
    onAudioDeviceChange,
    onVideoDeviceChange,
    showVideo = false
}: CallDeviceSelectorProps) {
    return (
        <div style={{
            padding: '16px',
            background: '#1a1a1a',
            borderRadius: '8px',
            marginBottom: '16px'
        }}>
            <div style={{ marginBottom: showVideo ? '16px' : '0' }}>
                <label
                    htmlFor="call-audio-device-select"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '8px',
                        color: '#00f2ff'
                    }}
                >
                    <Icon src={Icons.Mic} size="100" />
                    <span style={{ fontSize: '14px', fontWeight: 500 }}>Микрофон</span>
                </label>
                <select
                    id="call-audio-device-select"
                    name="call-audio-device"
                    value={selectedAudioDevice}
                    onChange={(e) => onAudioDeviceChange(e.target.value)}
                    style={{
                        width: '100%',
                        padding: '8px 12px',
                        background: '#111',
                        border: '1px solid #333',
                        borderRadius: '4px',
                        color: '#fff',
                        fontSize: '14px',
                        cursor: 'pointer'
                    }}
                >
                    {audioDevices.map(device => (
                        <option key={device.deviceId} value={device.deviceId}>
                            {device.label}
                        </option>
                    ))}
                </select>
            </div>

            {showVideo && (
                <div>
                    <label
                        htmlFor="call-video-device-select"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            marginBottom: '8px',
                            color: '#a200ff'
                        }}
                    >
                        <Icon src={Icons.VideoCamera} size="100" />
                        <span style={{ fontSize: '14px', fontWeight: 500 }}>Камера</span>
                    </label>
                    <select
                        id="call-video-device-select"
                        name="call-video-device"
                        value={selectedVideoDevice}
                        onChange={(e) => onVideoDeviceChange(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '8px 12px',
                            background: '#111',
                            border: '1px solid #333',
                            borderRadius: '4px',
                            color: '#fff',
                            fontSize: '14px',
                            cursor: 'pointer'
                        }}
                    >
                        {videoDevices.map(device => (
                            <option key={device.deviceId} value={device.deviceId}>
                                {device.label}
                            </option>
                        ))}
                    </select>
                </div>
            )}
        </div>
    );
}
