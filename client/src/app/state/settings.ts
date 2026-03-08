import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

export const settingsAtom = atomWithStorage('catlover_settings', {
    monochromeMode: false,
});

export type DateFormat = string;
export type MessageSpacing = string;
export enum MessageLayout {
    Modern = 'modern',
    Compact = 'compact',
    Bubble = 'bubble'
}
