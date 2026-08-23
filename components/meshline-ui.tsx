import { MaterialIcons } from "@expo/vector-icons";
import { PropsWithChildren, ReactNode } from "react";
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { useColors } from "@/hooks/use-colors";

export const palette = {
  ink: "#182033",
  muted: "#667085",
  soft: "#F6F7FB",
  surface: "#FFFFFF",
  line: "#E8EBF3",
  indigo: "#4459E9",
  indigoSoft: "#EEF0FF",
  emerald: "#159B6A",
  emeraldSoft: "#EAF8F1",
  amber: "#C87900",
  amberSoft: "#FFF6E5",
  coral: "#D94D61",
};

export function MeshlineMark({ size = 42 }: { size?: number }) {
  return (
    <View style={[styles.mark, { width: size, height: size, borderRadius: size * 0.31 }]}>
      <View style={[styles.markDot, { width: size * 0.19, height: size * 0.19, borderRadius: size }]} />
      <View style={[styles.markLine, { width: size * 0.45, left: size * 0.31, top: size * 0.29 }]} />
      <View style={[styles.markLine, { width: size * 0.34, left: size * 0.29, top: size * 0.58, transform: [{ rotate: "-29deg" }] }]} />
    </View>
  );
}

export function Avatar({ label, size = 46, tone = "indigo" }: { label: string; size?: number; tone?: "indigo" | "emerald" | "slate" }) {
  const colors = useColors();
  const background = tone === "emerald" ? `${colors.success}1C` : tone === "slate" ? colors.background : `${colors.tint}1C`;
  const color = tone === "emerald" ? colors.success : tone === "slate" ? colors.muted : colors.tint;
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: background }]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.36, color }]}>{label.slice(0, 1).toUpperCase()}</Text>
    </View>
  );
}

export function StatusPill({ icon, children, variant = "neutral" }: PropsWithChildren<{ icon: keyof typeof MaterialIcons.glyphMap; variant?: "neutral" | "success" | "warning" }>) {
  const colors = useColors();
  const color = variant === "success" ? colors.success : variant === "warning" ? colors.warning : colors.muted;
  const backgroundColor = variant === "success" ? `${colors.success}1C` : variant === "warning" ? `${colors.warning}1C` : colors.background;
  return (
    <View style={[styles.pill, { backgroundColor }]}>
      <MaterialIcons name={icon} size={14} color={color} />
      <Text style={[styles.pillText, { color }]}>{children}</Text>
    </View>
  );
}

export function SectionCard({ children, style }: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  const colors = useColors();
  return <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, style]}>{children}</View>;
}

export function RowChevron({ icon, title, detail, onPress, tint = palette.indigo }: { icon: keyof typeof MaterialIcons.glyphMap; title: string; detail?: string; onPress: () => void; tint?: string }) {
  const colors = useColors();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, { borderBottomColor: colors.border }, pressed && styles.pressed]}>
      <View style={[styles.rowIcon, { backgroundColor: `${tint}16` }]}>
        <MaterialIcons name={icon} size={19} color={tint} />
      </View>
      <View style={styles.rowCopy}>
        <Text style={[styles.rowTitle, { color: colors.text }]}>{title}</Text>
        {detail ? <Text style={[styles.rowDetail, { color: colors.muted }]}>{detail}</Text> : null}
      </View>
      <MaterialIcons name="chevron-right" size={22} color={colors.muted} />
    </Pressable>
  );
}

export function PrimaryButton({ label, onPress, icon, disabled = false }: { label: string; onPress: () => void; icon?: keyof typeof MaterialIcons.glyphMap; disabled?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={({ pressed }) => [styles.primaryButton, disabled && styles.disabledButton, pressed && !disabled && styles.pressedButton]}>
      {icon ? <MaterialIcons name={icon} size={19} color="#FFFFFF" /> : null}
      <Text style={styles.primaryButtonText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  mark: { backgroundColor: palette.indigo, justifyContent: "center" },
  markDot: { position: "absolute", backgroundColor: "#FFFFFF", left: "21%", top: "23%" },
  markLine: { position: "absolute", height: 2.6, borderRadius: 8, backgroundColor: "#FFFFFF" },
  avatar: { alignItems: "center", justifyContent: "center" },
  avatarText: { fontWeight: "800" },
  pill: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", borderRadius: 99, paddingHorizontal: 9, paddingVertical: 5, gap: 5 },
  pillText: { fontSize: 12, lineHeight: 15, fontWeight: "700" },
  card: { backgroundColor: palette.surface, borderColor: palette.line, borderWidth: 1, borderRadius: 22, overflow: "hidden" },
  row: { minHeight: 69, flexDirection: "row", alignItems: "center", paddingHorizontal: 16, borderBottomColor: palette.line, borderBottomWidth: StyleSheet.hairlineWidth },
  rowIcon: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center", marginRight: 12 },
  rowCopy: { flex: 1, gap: 2 },
  rowTitle: { color: palette.ink, fontSize: 16, lineHeight: 21, fontWeight: "700" },
  rowDetail: { color: palette.muted, fontSize: 13, lineHeight: 17 },
  primaryButton: { minHeight: 54, borderRadius: 17, backgroundColor: palette.indigo, alignItems: "center", justifyContent: "center", gap: 8, flexDirection: "row", paddingHorizontal: 20 },
  primaryButtonText: { color: "#FFFFFF", fontSize: 16, lineHeight: 21, fontWeight: "800" },
  disabledButton: { opacity: 0.5 },
  pressed: { opacity: 0.68 },
  pressedButton: { transform: [{ scale: 0.98 }], opacity: 0.92 },
});
