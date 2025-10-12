import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
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
  Flame
} from 'lucide-react-native';

interface RouteCoordinate {
  latitude: number;
  longitude: number;
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
}

interface RunHistorySectionProps {
  runs: Run[];
  onRunPress: (runId: string) => void;
  formatTime: (seconds: number) => string;
  formatPace: (pace: number) => string;
}

type SortOption = 'date' | 'distance' | 'time' | 'pace';
type FilterPeriod = 'all' | 'week' | 'month' | '3months' | 'year';

export default function RunHistorySection({ 
  runs, 
  onRunPress, 
  formatTime, 
  formatPace 
}: RunHistorySectionProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('date');
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [showAllRuns, setShowAllRuns] = useState(false);

  // Filter runs by period
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

  // Filter runs by search query
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

  // Sort runs
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
        return sorted.sort((a, b) => a.pace - b.pace); // Faster pace first
      default:
        return sorted;
    }
  }, [searchFiltered, sortBy]);

  // Display runs (show limited or all based on state)
  const displayRuns = showAllRuns ? sortedRuns : sortedRuns.slice(0, 10);

  // Calculate summary stats
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
      case 'all': return 'All Time';
      case 'week': return 'This Week';
      case 'month': return 'This Month';
      case '3months': return 'Last 3 Months';
      case 'year': return 'This Year';
    }
  };

  const getSortLabel = (sort: SortOption) => {
    switch (sort) {
      case 'date': return 'Date';
      case 'distance': return 'Distance';
      case 'time': return 'Duration';
      case 'pace': return 'Pace';
    }
  };

  if (runs.length === 0) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Run History</Text>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No runs yet. Start your first run!</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Run History</Text>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Filter size={20} color="#00ADB5" />
          <Text style={styles.filterButtonText}>Filters</Text>
          {showFilters ? (
            <ChevronUp size={16} color="#00ADB5" />
          ) : (
            <ChevronDown size={16} color="#00ADB5" />
          )}
        </TouchableOpacity>
      </View>

      {showFilters && (
        <View style={styles.filtersContainer}>
          {/* Search */}
          <View style={styles.searchContainer}>
            <Search size={20} color="#6B7280" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search runs..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#9CA3AF"
            />
          </View>

          {/* Filter and Sort Options */}
          <View style={styles.filterRow}>
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Period:</Text>
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
              <Text style={styles.filterLabel}>Sort by:</Text>
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

      {/* Summary Stats */}
      {sortedRuns.length > 0 && (
        <View style={styles.summaryContainer}>
          <Text style={styles.summaryTitle}>
            {getPeriodLabel(filterPeriod)} Summary ({summaryStats.totalRuns} runs)
          </Text>
          <View style={styles.summaryStats}>
            <View style={styles.summaryStat}>
              <MapPin size={16} color="#00ADB5" />
              <Text style={styles.summaryStatValue}>{summaryStats.totalDistance.toFixed(1)}</Text>
              <Text style={styles.summaryStatLabel}>miles</Text>
            </View>
            <View style={styles.summaryStat}>
              <Clock size={16} color="#00ADB5" />
              <Text style={styles.summaryStatValue}>{formatTime(summaryStats.totalTime)}</Text>
              <Text style={styles.summaryStatLabel}>total</Text>
            </View>
            <View style={styles.summaryStat}>
              <TrendingUp size={16} color="#00ADB5" />
              <Text style={styles.summaryStatValue}>{formatPace(summaryStats.avgPace)}</Text>
              <Text style={styles.summaryStatLabel}>avg pace</Text>
            </View>
            <View style={styles.summaryStat}>
              <Flame size={16} color="#00ADB5" />
              <Text style={styles.summaryStatValue}>{summaryStats.totalCalories}</Text>
              <Text style={styles.summaryStatLabel}>calories</Text>
            </View>
          </View>
        </View>
      )}

      {/* Run List */}
      {displayRuns.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>
            No runs found for the selected filters.
          </Text>
        </View>
      ) : (
        <>
          {displayRuns.map((run) => (
            <TouchableOpacity
              key={run.id}
              style={styles.runCard}
              onPress={() => onRunPress(run.id)}
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
                {run.weather && (
                  <Text style={styles.runWeatherText}>{run.weather}</Text>
                )}
              </View>
              <View style={styles.runStats}>
                <View style={styles.runStat}>
                  <Text style={styles.runStatValue}>{run.distance.toFixed(2)}</Text>
                  <Text style={styles.runStatLabel}>mi</Text>
                </View>
                <View style={styles.runStat}>
                  <Text style={styles.runStatValue}>{formatTime(run.time)}</Text>
                  <Text style={styles.runStatLabel}>time</Text>
                </View>
                <View style={styles.runStat}>
                  <Text style={styles.runStatValue}>{formatPace(run.pace)}</Text>
                  <Text style={styles.runStatLabel}>pace</Text>
                </View>
                <View style={styles.runStat}>
                  <Text style={styles.runStatValue}>{run.calories}</Text>
                  <Text style={styles.runStatLabel}>cal</Text>
                </View>
              </View>
              <ChevronRight size={20} color="#9CA3AF" />
            </TouchableOpacity>
          ))}

          {/* Show More/Less Button */}
          {sortedRuns.length > 10 && (
            <TouchableOpacity
              style={styles.showMoreButton}
              onPress={() => setShowAllRuns(!showAllRuns)}
            >
              <Text style={styles.showMoreText}>
                {showAllRuns 
                  ? `Show Less (${sortedRuns.length - 10} hidden)` 
                  : `Show All ${sortedRuns.length} Runs`
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
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F9FAFB',
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
    backgroundColor: '#171B22',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2329',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    gap: 8,
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
    backgroundColor: '#171B22',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
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
    backgroundColor: '#171B22',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  runCard: {
    backgroundColor: '#171B22',
    borderRadius: 15,
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
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
});