import React, { useState, useEffect, useRef } from 'react';
import { Avatar, Scroll } from 'folds';
import { MentionAutocompleteItem } from '../types/chatOrganization';

interface MentionAutocompleteProps {
  roomId: string;
  members: MentionAutocompleteItem[];
  searchQuery: string;
  position: { top: number; left: number };
  onSelect: (username: string) => void;
  onClose: () => void;
}

export function MentionAutocomplete({
  roomId,
  members,
  searchQuery,
  position,
  onSelect,
  onClose,
}: MentionAutocompleteProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Filter members by search query
  const filteredMembers = members.filter(member =>
    member.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Reset selected index when filtered members change
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  // Scroll selected item into view
  useEffect(() => {
    if (itemRefs.current[selectedIndex]) {
      itemRefs.current[selectedIndex]?.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    }
  }, [selectedIndex]);

  // Handle keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (filteredMembers.length === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev =>
            prev < filteredMembers.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => (prev > 0 ? prev - 1 : prev));
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredMembers[selectedIndex]) {
            onSelect(filteredMembers[selectedIndex].username);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [filteredMembers, selectedIndex, onSelect, onClose]);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  if (filteredMembers.length === 0) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        top: `${position.top}px`,
        left: `${position.left}px`,
        width: '280px',
        maxHeight: '300px',
        backgroundColor: '#1a1a1a',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '12px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        zIndex: 1000,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        fontSize: '12px',
        color: '#888',
        fontWeight: 'bold',
      }}>
        Упомянуть участника
      </div>

      {/* Member list */}
      <Scroll style={{ maxHeight: '252px' }}>
        {filteredMembers.map((member, index) => (
          <div
            key={member.user_id}
            ref={el => { itemRefs.current[index] = el; }}
            onClick={() => onSelect(member.username)}
            onMouseEnter={() => setSelectedIndex(index)}
            style={{
              padding: '10px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              cursor: 'pointer',
              backgroundColor: selectedIndex === index ? 'rgba(0, 242, 255, 0.1)' : 'transparent',
              transition: 'background 0.15s',
              minHeight: '48px', // Touch-friendly
            }}
            className="mention-item"
          >
            {/* Avatar */}
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: 'rgba(0, 242, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                color: '#00f2ff',
                flexShrink: 0,
                backgroundImage: member.avatar_url ? `url(${member.avatar_url})` : undefined,
                backgroundSize: 'cover',
              }}
            >
              {!member.avatar_url && member.username.charAt(0).toUpperCase()}
            </div>

            {/* Username */}
            <div style={{
              fontSize: '14px',
              color: selectedIndex === index ? '#00f2ff' : '#fff',
              fontWeight: selectedIndex === index ? 'bold' : 'normal',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              @{member.username}
            </div>
          </div>
        ))}
      </Scroll>

      {/* Footer hint */}
      <div style={{
        padding: '8px 16px',
        borderTop: '1px solid rgba(255,255,255,0.05)',
        fontSize: '11px',
        color: '#666',
        display: 'flex',
        gap: '12px',
      }}>
        <span>↑↓ Навигация</span>
        <span>Enter Выбрать</span>
        <span>Esc Закрыть</span>
      </div>

      {/* Styles */}
      <style>{`
        .mention-item:hover {
          background-color: rgba(0, 242, 255, 0.1);
        }
        
        /* Mobile touch optimizations */
        @media (hover: none) and (pointer: coarse) {
          .mention-item {
            -webkit-tap-highlight-color: transparent;
          }
        }
      `}</style>
    </div>
  );
}
