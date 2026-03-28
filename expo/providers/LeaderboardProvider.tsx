import createContextHook from "@nkzw/create-context-hook";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useMemo } from "react";

import { useApp } from "@/providers/AppProvider";
import {
  fetchLeaderboard,
  upsertLeaderboardEntry,
  fetchUserRank,
} from "@/utils/supabase";
import { getRankForLevel } from "@/constants/xp";
import { AVATAR_OPTIONS } from "@/constants/badges";

export const [LeaderboardProvider, useLeaderboard] = createContextHook(() => {
  const {
    user,
    xpInfo,
    stats,
    recentRuns,
  } = useApp();
  const queryClient = useQueryClient();
  const lastSyncedXP = useRef<number>(0);

  const leaderboardQuery = useQuery({
    queryKey: ["leaderboard"],
    queryFn: () => fetchLeaderboard(100),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const userRankQuery = useQuery({
    queryKey: ["userRank", user.id],
    queryFn: () => fetchUserRank(user.id),
    staleTime: 30_000,
    enabled: !!user.id,
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const rank = getRankForLevel(xpInfo.level);
      const avatar = AVATAR_OPTIONS.find((a) => a.id === user.profileImage) || AVATAR_OPTIONS[0];
      const totalMiles = recentRuns.reduce((sum, r) => sum + r.distance, 0);

      await upsertLeaderboardEntry({
        user_id: user.id,
        display_name: avatar.emoji + " " + rank.title + " Lv." + xpInfo.level,
        avatar_id: user.profileImage || "default",
        total_xp: xpInfo.totalXP,
        level: xpInfo.level,
        rank_title: rank.title,
        rank_emoji: rank.emoji,
        rank_color: rank.color,
        total_runs: recentRuns.length,
        total_workouts: stats.totalWorkouts,
        total_miles: Math.round(totalMiles * 10) / 10,
        run_streak: stats.runStreak,
        workout_streak: stats.workoutStreak,
      });
    },
    onSuccess: () => {
      lastSyncedXP.current = xpInfo.totalXP;
      void queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
      void queryClient.invalidateQueries({ queryKey: ["userRank", user.id] });
    },
  });

  const syncMutateRef = useRef(syncMutation.mutate);
  syncMutateRef.current = syncMutation.mutate;

  useEffect(() => {
    if (!user.id || xpInfo.totalXP === 0) return;
    if (xpInfo.totalXP !== lastSyncedXP.current) {
      const timer = setTimeout(() => {
        console.log("Syncing leaderboard data, XP:", xpInfo.totalXP);
        syncMutateRef.current();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [xpInfo.totalXP, user.id]);

  useEffect(() => {
    if (user.id && xpInfo.totalXP > 0 && lastSyncedXP.current === 0) {
      syncMutateRef.current();
    }
  }, [user.id, xpInfo.totalXP]);

  const refreshLeaderboard = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
    void queryClient.invalidateQueries({ queryKey: ["userRank", user.id] });
  }, [queryClient, user.id]);

  const forceSync = useCallback(() => {
    syncMutation.mutate();
  }, [syncMutation]);

  return useMemo(
    () => ({
      entries: leaderboardQuery.data || [],
      isLoading: leaderboardQuery.isLoading,
      isRefreshing: leaderboardQuery.isRefetching,
      userRank: userRankQuery.data ?? null,
      isSyncing: syncMutation.isPending,
      refreshLeaderboard,
      forceSync,
      userId: user.id,
    }),
    [
      leaderboardQuery.data,
      leaderboardQuery.isLoading,
      leaderboardQuery.isRefetching,
      userRankQuery.data,
      syncMutation.isPending,
      refreshLeaderboard,
      forceSync,
      user.id,
    ]
  );
});
