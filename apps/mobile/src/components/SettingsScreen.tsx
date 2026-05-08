import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useThemeStore } from "../stores/theme";

export function SettingsScreen() {
  const { theme, setTheme } = useThemeStore();

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Appearance</Text>
      {(["light", "dark", "system"] as const).map((t) => (
        <TouchableOpacity
          key={t}
          style={[
            styles.option,
            theme === t && styles.optionSelected,
          ]}
          onPress={() => setTheme(t)}
        >
          <Text style={styles.optionText}>{t.charAt(0).toUpperCase() + t.slice(1)}</Text>
        </TouchableOpacity>
      ))}

      <Text style={styles.sectionTitle}>Sync</Text>
      <Text style={styles.infoText}>Sync is configured in the desktop app</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#ffffff" },
  sectionTitle: { fontSize: 18, fontWeight: "600", marginTop: 24, marginBottom: 12 },
  option: {
    padding: 16,
    borderWidth: 1,
    borderColor: "#e5e5e5",
    borderRadius: 8,
    marginBottom: 8,
  },
  optionSelected: { borderColor: "#7c3aed", backgroundColor: "#f5f3ff" },
  optionText: { fontSize: 16 },
  infoText: { fontSize: 14, color: "#7a7a7a" },
});
