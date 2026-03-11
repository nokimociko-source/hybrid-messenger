import { useCallback } from 'react';
import { Message } from './supabaseHelpers';

interface ContextMenuOptions {
    onReply: (msg: Message) => void;
    onForward: (msg: Message) => void;
    onReport: (msg: Message) => void;
    onEdit: (msg: Message) => void;
    onDelete: (id: string) => void;
    onPin: (id: string) => void;
    onUnpin: (id: string) => void;
    onLongPress: (id: string) => void;
    onSelectUntilHere: (id: string) => void;
    isSelf: boolean;
    lastSelectedId: string | null;
}

export function useMessageContextMenu(options: ContextMenuOptions) {
    const {
        onReply, onForward, onReport, onEdit, onDelete, onPin, onUnpin,
        onLongPress, onSelectUntilHere, isSelf, lastSelectedId
    } = options;

    const getIconSvg = (iconName: string) => {
        const icons: Record<string, string> = {
            reply: '<path d="M19 12H5M12 19l-7-7 7-7"/>',
            copy: '<rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
            select: '<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
            select_range: '<path d="M7 11v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 11l-3-3L2 18"/><path d="M2 13v5h5"/>',
            pin: '<path d="M12 17v5M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/>',
            forward: '<path d="M5 12h14M12 5l7 7-7 7"/>',
            edit: '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>',
            delete: '<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
            report: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>'
        };
        return icons[iconName] || '';
    };

    const handleContextMenu = useCallback((e: React.MouseEvent, msg: Message, isMultiSelectMode: boolean) => {
        if (isMultiSelectMode) {
            e.preventDefault();
            return;
        }
        e.preventDefault();

        // Remove old menu if exists
        const oldMenu = document.getElementById('context-menu');
        if (oldMenu) document.body.removeChild(oldMenu);

        const menu = document.createElement('div');
        menu.id = 'context-menu';
        menu.style.cssText = `
            position: fixed;
            left: ${e.clientX}px;
            top: ${e.clientY}px;
            background: rgba(15, 15, 15, 0.98);
            border: 1px solid rgba(0, 242, 255, 0.2);
            border-radius: 12px;
            padding: 6px;
            z-index: 99999;
            backdrop-filter: blur(20px);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(0, 242, 255, 0.1);
            min-width: 180px;
            animation: menuFadeIn 0.15s ease-out;
        `;

        const actions = [
            { label: 'Ответить', icon: 'reply', action: () => onReply(msg), color: '#00f2ff' },
            {
                label: 'Копировать', icon: 'copy', action: () => {
                    navigator.clipboard.writeText(msg.content);
                }, color: '#00f2ff'
            },
            {
                label: 'Выбрать', icon: 'select', action: () => {
                    const menu = document.getElementById('context-menu');
                    if (menu && document.body.contains(menu)) {
                        document.body.removeChild(menu);
                    }
                    onLongPress(msg.id);
                }, color: '#00f2ff'
            },
            ...(lastSelectedId && lastSelectedId !== msg.id ? [
                { label: 'Выбрать до этого места', icon: 'select_range', action: () => onSelectUntilHere(msg.id), color: '#00f2ff' }
            ] : []),
            {
                label: msg.is_pinned ? 'Открепить' : 'Закрепить', icon: 'pin', action: () => {
                    if (msg.is_pinned) {
                        onUnpin(msg.id);
                    } else {
                        onPin(msg.id);
                    }
                }, color: '#00f2ff'
            },
            { label: 'Переслать', icon: 'forward', action: () => onForward(msg), color: '#00f2ff' },
            { label: 'Пожаловаться', icon: 'report', action: () => onReport(msg), color: '#ff4d4d' },
            ...(isSelf ? [
                { label: 'Редактировать', icon: 'edit', action: () => onEdit(msg), color: '#00f2ff' },
                { label: 'Удалить', icon: 'delete', action: () => onDelete(msg.id), color: '#ff4d4d' }
            ] : [])
        ];

        actions.forEach(({ label, icon, action, color }) => {
            const item = document.createElement('div');
            item.innerHTML = `
                <div style="display: flex; align-items: center; gap: 12px;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        ${getIconSvg(icon)}
                    </svg>
                    <span style="font-size: 14px; font-weight: 500;">${label}</span>
                </div>
            `;
            item.style.cssText = `
                padding: 10px 14px;
                cursor: pointer;
                color: #fff;
                border-radius: 8px;
                transition: all 0.15s ease;
                user-select: none;
            `;
            item.onmouseover = () => {
                item.style.background = 'rgba(0, 242, 255, 0.15)';
                item.style.transform = 'translateX(2px)';
            };
            item.onmouseout = () => {
                item.style.background = 'transparent';
                item.style.transform = 'translateX(0)';
            };
            item.onclick = () => {
                action();
                if (document.body.contains(menu)) {
                    document.body.removeChild(menu);
                }
            };
            menu.appendChild(item);
        });

        document.body.appendChild(menu);

        // Screen boundary checks
        const rect = menu.getBoundingClientRect();
        if (rect.right > window.innerWidth) {
            menu.style.left = `${window.innerWidth - rect.width - 10}px`;
        }
        if (rect.bottom > window.innerHeight) {
            menu.style.top = `${window.innerHeight - rect.height - 10}px`;
        }

        const closeMenu = (event: MouseEvent) => {
            if (!menu.contains(event.target as Node)) {
                if (document.body.contains(menu)) {
                    document.body.removeChild(menu);
                }
                document.removeEventListener('click', closeMenu);
            }
        };

        setTimeout(() => document.addEventListener('click', closeMenu), 0);
    }, [onReply, onForward, onReport, onEdit, onDelete, onPin, onUnpin, onLongPress, onSelectUntilHere, isSelf, lastSelectedId]);

    return { handleContextMenu };
}
