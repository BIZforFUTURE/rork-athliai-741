import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface LeaderboardEntry {
  id: string;
  user_id: string;
  display_name: string;
  avatar_id: string;
  total_xp: number;
  level: number;
  rank_title: string;
  rank_emoji: string;
  rank_color: string;
  total_runs: number;
  total_workouts: number;
  total_miles: number;
  run_streak: number;
  workout_streak: number;
  updated_at: string;
}

export async function ensureLeaderboardTable(): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('leaderboard')
      .select('id')
      .limit(1);

    if (error && error.code === '42P01') {
      console.log('Leaderboard table does not exist yet. It needs to be created in Supabase dashboard.');
      return false;
    }
    if (error) {
      console.error('Error checking leaderboard table:', error);
      return false;
    }
    return true;
  } catch (e) {
    console.error('Failed to check leaderboard table:', e);
    return false;
  }
}

export async function upsertLeaderboardEntry(entry: Omit<LeaderboardEntry, 'id' | 'updated_at'>): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('leaderboard')
      .upsert(
        {
          ...entry,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );

    if (error) {
      console.error('Error upserting leaderboard entry:', error);
      return false;
    }
    console.log('Leaderboard entry synced successfully');
    return true;
  } catch (e) {
    console.error('Failed to upsert leaderboard entry:', e);
    return false;
  }
}

export async function fetchLeaderboard(limit = 100): Promise<LeaderboardEntry[]> {
  try {
    const { data, error } = await supabase
      .from('leaderboard')
      .select('*')
      .order('total_xp', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching leaderboard:', error);
      return [];
    }
    return (data as LeaderboardEntry[]) || [];
  } catch (e) {
    console.error('Failed to fetch leaderboard:', e);
    return [];
  }
}

export async function fetchUserRank(userId: string): Promise<number | null> {
  try {
    const { data, error } = await supabase
      .from('leaderboard')
      .select('user_id, total_xp')
      .order('total_xp', { ascending: false });

    if (error || !data) return null;

    const index = data.findIndex((entry: { user_id: string }) => entry.user_id === userId);
    return index >= 0 ? index + 1 : null;
  } catch {
    return null;
  }
}
