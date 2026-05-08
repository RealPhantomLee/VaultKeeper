import { useState, useCallback } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useVaultStore } from "../stores/vault";
import { Note } from "@vaultkeeper/types";

export function NoteListScreen() {
  const navigation = useNavigation();
  const { notes } = useVaultStore();
  const [search, setSearch] = useState("");

  const filteredNotes = useCallback(() => {
    const notesArray = Array.from(notes.values()).filter((n) => !n.isDeleted);
    if (!search) return notesArray;
    const lower = search.toLowerCase();
    return notesArray.filter(
      (n) =>
        n.title.toLowerCase().includes(lower) ||
        n.content.toLowerCase().includes(lower),
    );
  }, [notes, search]);

  const renderItem = ({ item }: { item: Note }) => (
    <TouchableOpacity
      style={styles.noteItem}
      onPress={() =>
        (navigation as any).navigate("Editor", { noteId: item.id })
      }
    >
      <Text style={styles.noteTitle}>{item.title}</Text>
      <Text style={styles.notePreview} numberOfLines={2}>
        {item.content.slice(0, 100)}
      </Text>
      <Text style={styles.noteDate}>
        {new Date(item.updatedAt).toLocaleDateString()}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchInput}
        placeholder="Search notes..."
        value={search}
        onChangeText={setSearch}
        placeholderTextColor="#7a7a7a"
      />
      <FlatList
        data={filteredNotes()}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No notes yet. Tap + to create one.</Text>
        }
      />
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => (navigation as any).navigate("Editor", { noteId: null })}
      >
        <Text style={styles.addButtonText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ffffff" },
  searchInput: {
    margin: 12,
    padding: 12,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    fontSize: 16,
  },
  list: { padding: 12 },
  noteItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
  },
  noteTitle: { fontSize: 16, fontWeight: "600", marginBottom: 4 },
  notePreview: { fontSize: 14, color: "#7a7a7a", marginBottom: 4 },
  noteDate: { fontSize: 12, color: "#a3a3a3" },
  emptyText: { textAlign: "center", marginTop: 40, color: "#7a7a7a" },
  addButton: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#7c3aed",
    justifyContent: "center",
    alignItems: "center",
  },
  addButtonText: { fontSize: 28, color: "#ffffff", fontWeight: "bold" },
});
