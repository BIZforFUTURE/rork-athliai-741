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
    const isFuture = item.status === "future";

    return (
      <View
        key={`day-${item.day}`}
        style={styles.dayCell}
      >
        <View style={[styles.dayInner, isTodayDay && styles.dayInnerToday]}>
          <Text
            style={[
              styles.dayNumber,
              isTodayDay && styles.dayNumberToday,
              isFuture && styles.dayNumberFuture,
            ]}
          >
            {item.day}
          </Text>
          {item.status === "worked_out" && (
            <View style={styles.checkBadge}>
              <Check size={10} color="#FFFFFF" strokeWidth={3} />
            </View>
          )}
          {item.status === "missed" && (
            <View style={styles.missBadge}>
              <X size={10} color="#FFFFFF" strokeWidth={3} />
            </View>
          )}
          {item.status === "rest" && (
            <View style={styles.restBadge}>
              <Minus size={8} color="#4B5563" strokeWidth={3} />
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
    backgroundColor: "#0A0E1A",
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
    backgroundColor: "#151921",
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  monthNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 22,
    gap: 20,
  },
  navButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: "#F3F4F6",
    letterSpacing: -0.2,
    minWidth: 160,
    textAlign: "center" as const,
  },
  weekDayHeader: {
    flexDirection: "row",
    marginBottom: 6,
  },
  weekDayHeaderCell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
  },
  weekDayHeaderText: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: "#4B5563",
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
  weekRow: {
    flexDirection: "row",
    marginBottom: 2,
  },
  dayCell: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 3,
  },
  dayInner: {
    width: 42,
    height: 54,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  dayInnerToday: {
    backgroundColor: "rgba(0, 173, 181, 0.10)",
    borderWidth: 1.5,
    borderColor: "rgba(0, 173, 181, 0.30)",
  },
  dayNumber: {
    fontSize: 14,
    fontWeight: "500" as const,
    color: "#9CA3AF",
  },
  dayNumberToday: {
    color: "#FFFFFF",
    fontWeight: "700" as const,
  },
  dayNumberFuture: {
    color: "#4B5563",
  },
  checkBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#10B981",
    alignItems: "center",
    justifyContent: "center",
  },
  missBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
  },
  restBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "rgba(55, 65, 81, 0.30)",
    alignItems: "center",
    justifyContent: "center",
  },
  futureDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  legendCard: {
    marginTop: 14,
    backgroundColor: "#151921",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  legendTitle: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: "#6B7280",
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  legendItems: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  legendText: {
    fontSize: 13,
    color: "#9CA3AF",
    fontWeight: "500" as const,
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  statBox: {
    flex: 1,
    backgroundColor: "#151921",
    borderRadius: 18,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  statDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "700" as const,
    color: "#F3F4F6",
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 3,
    fontWeight: "500" as const,
  },
});
