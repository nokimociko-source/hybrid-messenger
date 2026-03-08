import { logger } from '../utils/logger';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import { getCurrentUser, getCurrentUserId } from '../utils/authCache';

export interface PollOption {
  id: string;
  text: string;
}

export interface Poll {
  id: string;
  room_id: string;
  message_id: string | null;
  created_by: string;
  question: string;
  options: PollOption[];
  is_anonymous: boolean;
  allows_multiple: boolean;
  closes_at: string | null;
  is_closed: boolean;
  created_at: string;
  votes?: PollVote[];
  vote_counts?: Record<string, number>;
  user_votes?: string[]; // option_ids voted by current user
}

export interface PollVote {
  id: string;
  poll_id: string;
  user_id: string;
  option_id: string;
  created_at: string;
}

export function usePolls(roomId: string | undefined) {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchPolls = useCallback(async () => {
    if (!roomId) {
      setLoading(false);
      return;
    }

    try {
      const { data: pollsData, error: pollsError } = await supabase
        .from('polls')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: false });

      if (pollsError) throw pollsError;

      // Fetch votes for all polls
      const pollIds = (pollsData || []).map((p) => p.id);
      const { data: votesData, error: votesError } = await supabase
        .from('poll_votes')
        .select('*')
        .in('poll_id', pollIds);

      if (votesError) throw votesError;

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Combine polls with votes
      const pollsWithVotes = (pollsData || []).map((poll) => {
        const pollVotes = (votesData || []).filter((v) => v.poll_id === poll.id);
        const voteCounts: Record<string, number> = {};
        const userVotes: string[] = [];

        pollVotes.forEach((vote) => {
          voteCounts[vote.option_id] = (voteCounts[vote.option_id] || 0) + 1;
          if (user && vote.user_id === user.id) {
            userVotes.push(vote.option_id);
          }
        });

        return {
          ...poll,
          votes: pollVotes,
          vote_counts: voteCounts,
          user_votes: userVotes,
        };
      });

      setPolls(pollsWithVotes);
      setError(null);
    } catch (err) {
      logger.error('Error fetching polls:', err);
      setError(err instanceof Error ? err : new Error('Не удалось загрузить опросы'));
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    fetchPolls();

    if (!roomId) return;

    // Realtime subscriptions
    const pollsChannel = supabase
      .channel(`polls_${roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'polls',
          filter: `room_id=eq.${roomId}`,
        },
        () => {
          fetchPolls();
        }
      )
      .subscribe();

    const votesChannel = supabase
      .channel(`poll_votes_${roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'poll_votes',
        },
        () => {
          fetchPolls();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(pollsChannel);
      supabase.removeChannel(votesChannel);
    };
  }, [roomId, fetchPolls]);

  const createPoll = async (data: {
    question: string;
    options: string[];
    isAnonymous?: boolean;
    allowsMultiple?: boolean;
    closesInHours?: number;
  }) => {
    if (!roomId) return null;

    try {
      const options: PollOption[] = data.options.map((text, index) => ({
        id: `opt_${index}`,
        text,
      }));

      const closesAt = data.closesInHours
        ? new Date(Date.now() + data.closesInHours * 60 * 60 * 1000).toISOString()
        : null;

      const { data: poll, error } = await supabase
        .from('polls')
        .insert({
          room_id: roomId,
          question: data.question,
          options,
          is_anonymous: data.isAnonymous || false,
          allows_multiple: data.allowsMultiple || false,
          closes_at: closesAt,
        })
        .select()
        .single();

      if (error) throw error;

      // Log to audit
      await supabase.from('room_audit_log').insert({
        room_id: roomId,
        action: 'poll_created',
        details: { poll_id: poll.id, question: data.question },
      });

      return poll;
    } catch (err) {
      logger.error('Error creating poll:', err);
      setError(err instanceof Error ? err : new Error('Не удалось создать опрос'));
      return null;
    }
  };

  const vote = async (pollId: string, optionId: string) => {
    try {
      const { error } = await supabase.from('poll_votes').insert({
        poll_id: pollId,
        option_id: optionId,
      });

      if (error) throw error;
      return true;
    } catch (err) {
      logger.error('Error voting:', err);
      setError(err instanceof Error ? err : new Error('Не удалось проголосовать'));
      return false;
    }
  };

  const unvote = async (pollId: string, optionId: string) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return false;

      const { error } = await supabase
        .from('poll_votes')
        .delete()
        .eq('poll_id', pollId)
        .eq('user_id', user.id)
        .eq('option_id', optionId);

      if (error) throw error;
      return true;
    } catch (err) {
      logger.error('Error unvoting:', err);
      return false;
    }
  };

  const closePoll = async (pollId: string) => {
    try {
      const { error } = await supabase
        .from('polls')
        .update({ is_closed: true })
        .eq('id', pollId);

      if (error) throw error;
      return true;
    } catch (err) {
      logger.error('Error closing poll:', err);
      return false;
    }
  };

  return {
    polls,
    loading,
    error,
    createPoll,
    vote,
    unvote,
    closePoll,
    refresh: fetchPolls,
  };
}
