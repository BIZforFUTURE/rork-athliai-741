import React, { useState, useMemo, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronLeft, ChevronRight, Check, X, Minus, ArrowLeft } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useApp } from "@/providers/AppProvider";
import { LinearGradient } from "expo-linear-gradient";

const DAYS_OF_WEEK = ["S", "M", "T", "W", "T", "F", "S"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

type DayStatus = "worked_out" | "missed" | "rest" | "future" | "empty";

export default function GymCalendarScreen() {
  const insets = useSafeAreaInsets();
  const { workoutLogs, customWorkoutPlan } = useApp();
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  const today = useMemo(() => new Date(), []);

  const workoutDays = useMemo(() => {
    return customWorkoutPlan?.workoutDays ?? [];
  }, [customWorkoutPlan]);

  const workoutDatesSet = useMemo(() => {
    const set = new Set<string>();
    workoutLogs.forEach((log) => {
      if (log.completed) {
        const d = new Date(log.date);
        const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        set.add(key);
      }
    });
    return set;
  }, [workoutLogs]);

  const getDaysInMonth = useCallback((month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  }, []);

  const getFirstDayOfMonth = useCallback((month: number, year: number) => {
    return new Date(year, month, 1).getDay();
  }, []);

  const getDayStatus = useCallback(
    (day: number, month: number, year: number): DayStatus => {
      const date = new Date(year, month, day);
      const dateKey = `${year}-${month}-${day}`;

      if (date > today) return "future";

      const didWorkout = workoutDatesSet.has(dateKey);
      if (didWorkout) return "worked_out";

      const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
      const dayName = dayNames[date.getDay()];
      const isScheduledDay = workoutDays.includes(dayName);

      if (isScheduledDay) return "missed";

      return "rest";
    },
    [today, workoutDatesSet, workoutDays]
  );

  const calendarData = useMemo(() => {
    const daysInMonth = getDaysInMonth(currentMonth, currentYear);
    const firstDay = getFirstDayOfMonth(currentMonth, currentYear);
    const weeks: { day: number; status: DayStatus }[][] = [];
    let currentWeek: { day: number; status: DayStatus }[] = [];

    for (let i = 0; i < firstDay; i++) {
      currentWeek.push({ day: 0, status: "empty" });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const status = getDayStatus(day, currentMonth, currentYear);
      currentWeek.push({ day, status });
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }

    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push({ day: 0, status: "empty" });
      }
      weeks.push(currentWeek);
    }

    return weeks;
  }, [currentMonth, currentYear, getDaysInMonth, getFirstDayOfMonth, getDayStatus]);

  const stats = useMemo(() => {
    const daysInMonth = getDaysInMonth(currentMonth, currentYear);
    let completed = 0;
    let missed = 0;
    let restDays = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const status = getDayStatus(day, currentMonth, currentYear);
      if (status === "worked_out") completed++;
      else if (status === "missed") missed++;
      else if (status === "rest") restDays++;
    }

    return { completed, missed, restDays };
  }, [currentMonth, currentYear, getDaysInMonth, getDayStatus]);

  const goToPrevMonth = () => {
    if (Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const isToday = (day: number) => {
    return (
      day === today.getDate() &&
      currentMonth === today.getMonth() &&
      currentYear === today.getFullYear()
    );
  };

  const renderDayCell = (item: { day: number; status: DayStatus }, index: number) => {
    if (item.day === 0) {
      return <View key={`empty-${index}`} style={styles.dayCell} />;
    }

    const isTodayDay = isToday(item.day);

    return (
      <View
        key={`day-${item.day}`}
        style={[styles.dayCell, isTodayDay && styles.dayCellToday]}
      >
        <Text style={[styles.dayNumber, isTodayDay && styles.dayNumberToday]}>
          {item.day}
        </Text>
        <View style={styles.statusIconWrap}>
          {item.status === "worked_out" && (
            <View style={styles.checkBadge}>
              <Check size={12} color="#FFFFFF" strokeWidth={3} />
            </View>
          )}
          {item.status === "missed" && (
            <View style={styles.missBadge}>
              <X size={12} color="#FFFFFF" strokeWidth={3} />
            </View>
          )}
          {item.status === "rest" && (
            <View style={styles.restBadge}>
              <Minus size={10} color="#6B7280" strokeWidth={3} />
            </View>
          )}
          {item.status === "future" && <View style={styles.futureDot} />}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient
        colors={["#0D0F13", "#111520", "#0D0F13"]}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              if (Platform.OS !== "web") {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
              router.back();
            }}
            testID="gym-calendar-back"
          >
            <ArrowLeft size={22} color="#E5E7EB" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Workout Calendar</Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.calendarCard}>
          <View style={styles.monthNav}>
            <TouchableOpacity onPress={goToPrevMonth} style={styles.navButton}>
              <ChevronLeft size={22} color="#9CA3AF" />
            </TouchableOpacity>
            <Text style={styles.monthTitle}>
              {MONTH_NAMES[currentMonth]} {currentYear}
            </Text>
            <TouchableOpacity onPress={goToNextMonth} style={styles.navButton}>
              <ChevronRight size={22} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          <View style={styles.weekDayHeader}>
            {DAYS_OF_WEEK.map((d, i) => (
              <View key={`header-${i}`} style={styles.weekDayHeaderCell}>
                <Text style={styles.weekDayHeaderText}>{d}</Text>
              </View>
            ))}
          </View>

          {calendarData.map((week, weekIndex) => (
            <View key={`week-${weekIndex}`} style={styles.weekRow}>
              {week.map((item, dayIndex) => renderDayCell(item, dayIndex))}
            </View>
          ))}
        </View>

        <View style={styles.legendCard}>
          <Text style={styles.legendTitle}>Legend</Text>
          <View style={styles.legendItems}>
            <View style={styles.legendItem}>
              <View style={styles.checkBadge}>
                <Check size={12} color="#FFFFFF" strokeWidth={3} />
              </View>
              <Text style={styles.legendText}>Worked out</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={styles.missBadge}>
                <X size={12} color="#FFFFFF" strokeWidth={3} />
              </View>
              <Text style={styles.legendText}>Missed</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={styles.restBadge}>
                <Minus size={10} color="#6B7280" strokeWidth={3} />
              </View>
              <Text style={styles.legendText}>Rest day</Text>
            </View>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <View style={[styles.statDot, { backgroundColor: "#10B981" }]} />
            <Text style={styles.statValue}>{stats.completed}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={styles.statBox}>
            <View style={[styles.statDot, { backgroundColor: "#EF4444" }]} />
            <Text style={styles.statValue}>{stats.missed}</Text>
            <Text style={styles.statLabel}>Missed</Text>
          </View>
          <View style={styles.statBox}>
            <View style={[styles.statDot, { backgroundColor: "#374151" }]} />
            <Text style={styles.statValue}>{stats.restDays}</Text>
            <Text style={styles.statLabel}>Rest Days</Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0D0F13",
  },
  headerGradient: {
    paddingBottom: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: "#FFFFFF",
    letterSpacing: -0.3,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  calendarCard: {
    backgroundColor: "#141720",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  monthNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  monthTitle: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: "#FFFFFF",
    letterSpacing: -0.3,
  },
  weekDayHeader: {
    flexDirection: "row",
    marginBottom: 8,
  },
  weekDayHeaderCell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 6,
  },
  weekDayHeaderText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: "#6B7280",
  },
  weekRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  dayCell: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    minHeight: 56,
    borderRadius: 12,
  },
  dayCellToday: {
    backgroundColor: "rgba(0, 173, 181, 0.12)",
    borderWidth: 1.5,
    borderColor: "rgba(0, 173, 181, 0.35)",
  },
  dayNumber: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: "#9CA3AF",
    marginBottom: 4,
  },
  dayNumberToday: {
    color: "#FFFFFF",
    fontWeight: "700" as const,
  },
  statusIconWrap: {
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  checkBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#10B981",
    alignItems: "center",
    justifyContent: "center",
  },
  missBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
  },
  restBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(75, 85, 99, 0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  futureDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  legendCard: {
    marginTop: 16,
    backgroundColor: "#141720",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  legendTitle: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "#9CA3AF",
    marginBottom: 12,
  },
  legendItems: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  legendText: {
    fontSize: 13,
    color: "#D1D5DB",
    fontWeight: "500" as const,
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  statBox: {
    flex: 1,
    backgroundColor: "#141720",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  statDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "800" as const,
    color: "#F9FAFB",
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
    fontWeight: "500" as const,
  },
});
