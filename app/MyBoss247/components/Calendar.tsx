import { useState, useMemo } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, fontSize, borderRadius } from "../constants/theme";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function pad(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

function ymd(year: number, month: number, day: number): string {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

export function Calendar({
  value,
  onChange,
  minDate,
}: {
  value: string; // YYYY-MM-DD
  onChange: (date: string) => void;
  minDate?: string; // YYYY-MM-DD; days before this are disabled
}) {
  const initial = new Date(value + "T00:00:00");
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());

  const today = new Date();
  const todayStr = ymd(today.getFullYear(), today.getMonth(), today.getDate());

  const grid = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [viewYear, viewMonth]);

  const goPrev = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const goNext = () => {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={goPrev} style={styles.navBtn} hitSlop={10}>
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>
          {MONTHS[viewMonth]} {viewYear}
        </Text>
        <TouchableOpacity onPress={goNext} style={styles.navBtn} hitSlop={10}>
          <Ionicons name="chevron-forward" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.weekdays}>
        {WEEKDAYS.map((d, i) => (
          <Text key={i} style={styles.weekday}>
            {d}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {grid.map((day, i) => {
          if (day === null) return <View key={i} style={styles.cell} />;
          const cellStr = ymd(viewYear, viewMonth, day);
          const isSelected = cellStr === value;
          const isToday = cellStr === todayStr;
          const isDisabled = minDate ? cellStr < minDate : false;

          return (
            <TouchableOpacity
              key={i}
              style={[
                styles.cell,
                isSelected && styles.cellSelected,
                isToday && !isSelected && styles.cellToday,
              ]}
              disabled={isDisabled}
              onPress={() => onChange(cellStr)}
            >
              <Text
                style={[
                  styles.cellText,
                  isSelected && styles.cellTextSelected,
                  isToday && !isSelected && styles.cellTextToday,
                  isDisabled && styles.cellTextDisabled,
                ]}
              >
                {day}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const CELL_SIZE = 40;

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  navBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceSecondary,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: "700",
  },
  weekdays: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  weekday: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: "700",
    width: CELL_SIZE,
    textAlign: "center",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  cell: {
    width: `${100 / 7}%`,
    height: CELL_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  cellSelected: {
    // overlay accent achieved via inner Text style; we just colour the bg via wrap
  },
  cellToday: {},
  cellText: {
    width: 32,
    height: 32,
    lineHeight: 32,
    textAlign: "center",
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: "500",
    borderRadius: 16,
  },
  cellTextSelected: {
    backgroundColor: colors.primary,
    color: colors.background,
    fontWeight: "800",
    overflow: "hidden",
  },
  cellTextToday: {
    borderWidth: 1,
    borderColor: colors.primary,
    color: colors.primary,
    fontWeight: "700",
  },
  cellTextDisabled: {
    color: colors.textMuted,
    opacity: 0.3,
  },
});
