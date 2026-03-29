import React, { useState, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { 
  ChevronRight, 
  Filter, 
  Search,
  ChevronDown,
  ChevronUp,
  Clock,
  MapPin,
  TrendingUp,
  Flame,
  Camera,
  Trash2,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useLanguage } from '@/providers/LanguageProvider';

interface RouteCoordinate {
  latitude: number;
  longitude: number;
}

interface RunAchievement {
  id: string;
  title: string;
  description: string;
  emoji: string;
  color: string;
  category: string;
}

interface Run {
  id: string;
  date: string;
  distance: number;
  time: number;
  pace: number;
  calories: number;
  photos?: string[];
  notes?: string;
  weather?: string;
  route?: string;
  routeCoordinates?: RouteCoordinate[];
  treadmillVerified?: boolean;
  achievements?: RunAchievement[];
}

interface RunHistorySectionProps {
  runs: Run[];
  onRunPress: (runId: string) => void;
  onDeleteRun?: (runId: string) => void;
  formatTime: (seconds: number) => string;
  formatPace: (pace: number) => string;
}

type SortOption = 'date' | 'distance' | 'time' | 'pace';
type FilterPeriod = 'all' | 'week' | 'month' | '3months' | 'year';

export default function RunHistorySection({ 
  runs, 
  onRunPress,
  onDeleteRun,
  formatTime, 
  formatPace 
}: RunHistorySectionProps) {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('date');
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [showAllRuns, setShowAllRuns] = useState(false);

  const handleDeleteRun = useCallback((run: Run) => {
    if (!onDeleteRun) return;

    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    const dateStr = new Date(run.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

    Alert.alert(
      t('run_delete'),
      t('run_delete_confirm').replace('{distance}', run.distance.toFixed(2)).replace('{date}', dateStr),
      [
        { text: t('run_cancel'), style: "cancel" },
        {
          text: t('run_delete').split(' ').pop() || t('run_delete'),
          style: "destructive",
          onPress: () => {
            if (Platform.OS !== 'web') {
              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
            onDeleteRun(run.id);
          },
        },
      ]
    );
  }, [onDeleteRun, t]);

  const filteredByPeriod = useMemo(() => {
    if (filterPeriod === 'all') return runs;
    
    const now = new Date();
    const cutoffDate = new Date();
    
    switch (filterPeriod) {
      case 'week':
        cutoffDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        cutoffDate.setMonth(now.getMonth() - 1);
        break;
      case '3months':
        cutoffDate.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        cutoffDate.setFullYear(now.getFullYear() - 1);
        break;
    }
    
    return runs.filter(run => new Date(run.date) >= cutoffDate);
  }, [runs, filterPeriod]);

  const searchFiltered = useMemo(() => {
    if (!searchQuery.trim()) return filteredByPeriod;
    
    const query = searchQuery.toLowerCase();
    return filteredByPeriod.filter(run => {
      const date = new Date(run.date).toLocaleDateString().toLowerCase();
      const notes = run.notes?.toLowerCase() || '';
      const route = run.route?.toLowerCase() || '';
      const weather = run.weather?.toLowerCase() || '';
      
      return date.includes(query) || 
             notes.includes(query) || 
             route.includes(query) || 
             weather.includes(query);
    });
  }, [filteredByPeriod, searchQuery]);

  const sortedRuns = useMemo(() => {
    const sorted = [...searchFiltered];
    
    switch (sortBy) {
      case 'date':
        return sorted.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      case 'distance':
        return sorted.sort((a, b) => b.distance - a.distance);
      case 'time':
        return sorted.sort((a, b) => b.time - a.time);
      case 'pace':
        return sorted.sort((a, b) => a.pace - b.pace);
      default:
        return sorted;
    }
  }, [searchFiltered, sortBy]);

  const displayRuns = showAllRuns ? sortedRuns : sortedRuns.slice(0, 10);

  const summaryStats = useMemo(() => {
    const totalDistance = sortedRuns.reduce((sum, run) => sum + run.distance, 0);
    const totalTime = sortedRuns.reduce((sum, run) => sum + run.time, 0);
    const totalCalories = sortedRuns.reduce((sum, run) => sum + run.calories, 0);
    const avgPace = sortedRuns.length > 0 
      ? sortedRuns.reduce((sum, run) => sum + run.pace, 0) / sortedRuns.length 
      : 0;

    return {
      totalRuns: sortedRuns.length,
      totalDistance,
      totalTime,
      totalCalories,
      avgPace,
    };
  }, [sortedRuns]);

  const getPeriodLabel = (period: FilterPeriod) => {
    switch (period) {
      case 'all': return t('run_all_time');
      case 'week': return t('run_this_week');
      case 'month': return t('run_this_month');
      case '3months': return t('run_last_3_months');
      case 'year': return t('run_this_year');
    }
  };

  const getSortLabel = (sort: SortOption) => {
    switch (sort) {
      case 'date': return t('run_sort_date');
      case 'distance': return t('run_sort_distance');
      case 'time': return t('run_sort_duration');
      case 'pace': return t('run_sort_pace');
    }
  };

  if (runs.length === 0) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('run_history')}</Text>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>{t('run_no_runs')}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{t('run_history')}</Text>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Filter size={20} color="#00ADB5" />
          <Text style={styles.filterButtonText}>{t('run_filters')}</Text>
          {showFilters ? (
            <ChevronUp size={16} color="#00ADB5" />
          ) : (
            <ChevronDown size={16} color="#00ADB5" />
          )}
        </TouchableOpacity>
      </View>

      {showFilters && (
        <View style={styles.filtersContainer}>
          <View style={styles.searchContainer}>
            <Search size={20} color="#6B7280" />
            <TextInput
              style={styles.searchInput}
              placeholder={t('run_search')}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={styles.filterRow}>
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>{t('run_period')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.filterOptions}>
                  {(['all', 'week', 'month', '3months', 'year'] as FilterPeriod[]).map((period) => (
                    <TouchableOpacity
                      key={period}
                      style={[
                        styles.filterOption,
                        filterPeriod === period && styles.filterOptionActive
                      ]}
                      onPress={() => setFilterPeriod(period)}
                    >
                      <Text style={[
                        styles.filterOptionText,
                        filterPeriod === period && styles.filterOptionTextActive
                      ]}>
                        {getPeriodLabel(period)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>{t('run_sort_by')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.filterOptions}>
                  {(['date', 'distance', 'time', 'pace'] as SortOption[]).map((sort) => (
                    <TouchableOpacity
                      key={sort}
                      style={[
                        styles.filterOption,
                        sortBy === sort && styles.filterOptionActive
                      ]}
                      onPress={() => setSortBy(sort)}
                    >
                      <Text style={[
                        styles.filterOptionText,
                        sortBy === sort && styles.filterOptionTextActive
                      ]}>
                        {getSortLabel(sort)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          </View>
        </View>
      )}

      {sortedRuns.length > 0 && (
        <View style={styles.summaryContainer}>
          <Text style={styles.summaryTitle}>
            {getPeriodLabel(filterPeriod)} {t('run_summary')} ({summaryStats.totalRuns} {t('run_runs')})
          </Text>
          <View style={styles.summaryStats}>
            <View style={styles.summaryStat}>
              <MapPin size={16} color="#00ADB5" />
              <Text style={styles.summaryStatValue}>{summaryStats.totalDistance.toFixed(1)}</Text>
              <Text style={styles.summaryStatLabel}>{t('run_miles_lower')}</Text>
            </View>
            <View style={styles.summaryStat}>
              <Clock size={16} color="#00ADB5" />
              <Text style={styles.summaryStatValue}>{formatTime(summaryStats.totalTime)}</Text>
              <Text style={styles.summaryStatLabel}>{t('run_total')}</Text>
            </View>
            <View style={styles.summaryStat}>
              <TrendingUp size={16} color="#00ADB5" />
              <Text style={styles.summaryStatValue}>{formatPace(summaryStats.avgPace)}</Text>
              <Text style={styles.summaryStatLabel}>{t('run_avg_pace')}</Text>
            </View>
            <View style={styles.summaryStat}>
              <Flame size={16} color="#00ADB5" />
              <Text style={styles.summaryStatValue}>{summaryStats.totalCalories}</Text>
              <Text style={styles.summaryStatLabel}>{t('run_calories_lower')}</Text>
            </View>
          </View>
        </View>
      )}

      {displayRuns.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>
            {t('run_no_runs_filtered')}
          </Text>
        </View>
      ) : (
        <>
          {onDeleteRun && (
            <Text style={styles.deleteHint}>{t('run_delete_hint')}</Text>
          )}
          {displayRuns.map((run) => (
            <TouchableOpacity
              key={run.id}
              style={styles.runCard}
              onPress={() => onRunPress(run.id)}
              onLongPress={() => handleDeleteRun(run)}
              delayLongPress={500}
              testID={`run-card-${run.id}`}
            >
              <View style={styles.runDate}>
                <Text style={styles.runDateText}>
                  {new Date(run.date).toLocaleDateString("en-US", { 
                    month: "short", 
                    day: "numeric",
                    year: new Date(run.date).getFullYear() !== new Date().getFullYear() ? "numeric" : undefined
                  })}
                </Text>
                <Text style={styles.runTimeText}>
                  {new Date(run.date).toLocaleTimeString("en-US", { 
                    hour: "numeric", 
                    minute: "2-digit" 
                  })}
                </Text>
                {run.treadmillVerified && (
                  <View style={styles.treadmillBadge}>
                    <Camera size={10} color="#00E5FF" />
                    <Text style={styles.treadmillBadgeText}>{t('run_treadmill_label')}</Text>
                  </View>
                )}
                {run.achievements && run.achievements.length > 0 && (
                  <View style={styles.achievementBadge}>
                    <Text style={styles.achievementBadgeEmoji}>{run.achievements[0].emoji}</Text>
                    <Text style={styles.achievementBadgeText}>{run.achievements.length} {run.achievements.length === 1 ? 'achievement' : 'achievements'}</Text>
                  </View>
                )}
                {run.weather && (
                  <Text style={styles.runWeatherText}>{run.weather}</Text>
                )}
              </View>
              <View style={styles.runStats}>
                <View style={styles.runStat}>
                  <Text style={styles.runStatValue}>{run.distance.toFixed(2)}</Text>
                  <Text style={styles.runStatLabel}>{t('run_mi')}</Text>
                </View>
                <View style={styles.runStat}>
                  <Text style={styles.runStatValue}>{formatTime(run.time)}</Text>
                  <Text style={styles.runStatLabel}>{t('run_time_lower')}</Text>
                </View>
                <View style={styles.runStat}>
                  <Text style={styles.runStatValue}>{formatPace(run.pace)}</Text>
                  <Text style={styles.runStatLabel}>{t('run_pace')}</Text>
                </View>
                <View style={styles.runStat}>
                  <Text style={styles.runStatValue}>{run.calories}</Text>
                  <Text style={styles.runStatLabel}>{t('run_cal_lower')}</Text>
                </View>
              </View>
              <View style={styles.runCardActions}>
                {onDeleteRun && (
                  <TouchableOpacity
                    style={styles.deleteIconBtn}
                    onPress={() => handleDeleteRun(run)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    testID={`delete-run-${run.id}`}
                  >
                    <Trash2 size={16} color="#6B7280" />
                  </TouchableOpacity>
                )}
                <ChevronRight size={20} color="#9CA3AF" />
              </View>
            </TouchableOpacity>
          ))}

          {sortedRuns.length > 10 && (
            <TouchableOpacity
              style={styles.showMoreButton}
              onPress={() => setShowAllRuns(!showAllRuns)}
            >
              <Text style={styles.showMoreText}>
                {showAllRuns 
                  ? t('run_show_less').replace('{count}', String(sortedRuns.length - 10))
                  : t('run_show_all').replace('{count}', String(sortedRuns.length))
                }
              </Text>
              {showAllRuns ? (
                <ChevronUp size={20} color="#00ADB5" />
              ) : (
                <ChevronDown size={20} color="#00ADB5" />
              )}
            </TouchableOpacity>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 40,
    marginBottom: 30,
    paddingHorizontal: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 32,
    fontWeight: '800' as const,
    color: '#F5F5F5',
    letterSpacing: -0.5,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(0, 173, 181, 0.15)',
    borderRadius: 8,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#00ADB5',
  },
  filtersContainer: {
    backgroundColor: '#161616',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden' as const,
  },
  searchContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#F9FAFB',
  },
  filterRow: {
    gap: 16,
  },
  filterGroup: {
    gap: 8,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  filterOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  filterOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#1F2329',
    borderRadius: 6,
  },
  filterOptionActive: {
    backgroundColor: '#00ADB5',
  },
  filterOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#9CA3AF',
  },
  filterOptionTextActive: {
    color: '#FFFFFF',
  },
  summaryContainer: {
    backgroundColor: '#161616',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden' as const,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F9FAFB',
    marginBottom: 12,
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryStat: {
    alignItems: 'center',
    gap: 4,
  },
  summaryStatValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F9FAFB',
  },
  summaryStatLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  emptyState: {
    backgroundColor: '#161616',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center' as const,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  deleteHint: {
    fontSize: 12,
    color: '#4B5563',
    textAlign: 'center',
    marginBottom: 8,
  },
  runCard: {
    backgroundColor: '#161616',
    borderRadius: 20,
    padding: 15,
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden' as const,
  },
  runDate: {
    gap: 2,
    minWidth: 80,
  },
  runDateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F9FAFB',
  },
  runTimeText: {
    fontSize: 14,
    color: '#6B7280',
  },
  runWeatherText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  runStats: {
    flexDirection: 'row',
    gap: 20,
    flex: 1,
    justifyContent: 'center',
  },
  runStat: {
    alignItems: 'center',
  },
  runStatValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#00ADB5',
  },
  runStatLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  runCardActions: {
    alignItems: 'center',
    gap: 8,
  },
  deleteIconBtn: {
    padding: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(107, 114, 128, 0.1)',
  },
  showMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(0, 173, 181, 0.15)',
    borderRadius: 10,
    marginTop: 8,
  },
  showMoreText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#00ADB5',
  },
  treadmillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 3,
    backgroundColor: 'rgba(0,229,255,0.08)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start' as const,
  },
  treadmillBadgeText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: '#00E5FF',
  },
  achievementBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 3,
    marginTop: 3,
    backgroundColor: 'rgba(245,158,11,0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start' as const,
  },
  achievementBadgeEmoji: {
    fontSize: 10,
  },
  achievementBadgeText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: '#F59E0B',
  },
});
