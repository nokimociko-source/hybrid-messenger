import React from 'react';
import { Poll } from '../hooks/usePolls';

interface PollMessageProps {
  poll: Poll;
  onVote: (optionId: string) => void;
  onUnvote: (optionId: string) => void;
  canVote: boolean;
}

export function PollMessage({ poll, onVote, onUnvote, canVote }: PollMessageProps) {
  const totalVotes = Object.values(poll.vote_counts || {}).reduce((sum, count) => sum + count, 0);
  const isClosed = poll.is_closed || (poll.closes_at && new Date(poll.closes_at) < new Date());
  const userVotes = poll.user_votes || [];

  const getPercentage = (optionId: string) => {
    if (totalVotes === 0) return 0;
    const votes = poll.vote_counts?.[optionId] || 0;
    return Math.round((votes / totalVotes) * 100);
  };

  const handleOptionClick = (optionId: string) => {
    if (!canVote || isClosed) return;

    if (userVotes.includes(optionId)) {
      onUnvote(optionId);
    } else {
      if (!poll.allows_multiple && userVotes.length > 0) {
        // Unvote previous option first
        onUnvote(userVotes[0]);
      }
      onVote(optionId);
    }
  };

  return (
    <div
      style={{
        background: 'rgba(0, 242, 255, 0.05)',
        border: '1px solid rgba(0, 242, 255, 0.2)',
        borderRadius: '12px',
        padding: '16px',
        maxWidth: '400px',
      }}
    >
      {/* Question */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '16px', fontWeight: '600', color: '#fff', marginBottom: '4px' }}>
          📊 {poll.question}
        </div>
        <div style={{ fontSize: '12px', color: '#888' }}>
          {poll.is_anonymous && '🔒 Анонимный • '}
          {poll.allows_multiple && '☑️ Множественный • '}
          {totalVotes} {totalVotes === 1 ? 'голос' : totalVotes < 5 ? 'голоса' : 'голосов'}
        </div>
      </div>

      {/* Options */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
        {poll.options.map((option) => {
          const votes = poll.vote_counts?.[option.id] || 0;
          const percentage = getPercentage(option.id);
          const isVoted = userVotes.includes(option.id);

          return (
            <div
              key={option.id}
              onClick={() => handleOptionClick(option.id)}
              style={{
                position: 'relative',
                padding: '12px',
                background: isVoted ? 'rgba(0, 242, 255, 0.15)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${isVoted ? 'rgba(0, 242, 255, 0.4)' : 'rgba(255,255,255,0.1)'}`,
                borderRadius: '8px',
                cursor: canVote && !isClosed ? 'pointer' : 'default',
                overflow: 'hidden',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                if (canVote && !isClosed) {
                  e.currentTarget.style.background = isVoted
                    ? 'rgba(0, 242, 255, 0.2)'
                    : 'rgba(255,255,255,0.08)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = isVoted
                  ? 'rgba(0, 242, 255, 0.15)'
                  : 'rgba(255,255,255,0.05)';
              }}
            >
              {/* Progress bar */}
              {totalVotes > 0 && (
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: `${percentage}%`,
                    background: isVoted
                      ? 'linear-gradient(90deg, rgba(0, 242, 255, 0.3) 0%, rgba(0, 242, 255, 0.1) 100%)'
                      : 'linear-gradient(90deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
                    transition: 'width 0.3s ease',
                    zIndex: 0,
                  }}
                />
              )}

              {/* Content */}
              <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {isVoted && <span style={{ color: '#00f2ff', fontSize: '16px' }}>✓</span>}
                  <span style={{ fontSize: '14px', color: '#fff' }}>{option.text}</span>
                </div>
                {totalVotes > 0 && (
                  <div style={{ fontSize: '13px', color: '#00f2ff', fontWeight: '600' }}>
                    {percentage}% ({votes})
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Status */}
      {isClosed && (
        <div style={{ fontSize: '12px', color: '#ff4d4d', textAlign: 'center' }}>
          🔒 Опрос закрыт
        </div>
      )}
      {!isClosed && poll.closes_at && (
        <div style={{ fontSize: '12px', color: '#888', textAlign: 'center' }}>
          Закроется: {new Date(poll.closes_at).toLocaleString('ru-RU')}
        </div>
      )}
    </div>
  );
}
