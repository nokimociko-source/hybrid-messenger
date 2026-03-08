import { useAtom } from 'jotai';
import { useCallback } from 'react';

export function useSetting(atomRef: any, key: string) {
    const [settings, setSettings] = useAtom(atomRef);
    const value = (settings as any)[key];
    const setValue = useCallback((val: any) => {
        setSettings((prev: any) => ({ ...prev, [key]: val }));
    }, [setSettings, key]);
    return [value, setValue];
}
