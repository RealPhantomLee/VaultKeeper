import { useState, useEffect } from "react";
import { View, TextInput, StyleSheet, ScrollView, Text } from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useVaultStore } from "../stores/vault";

export function NoteEditorScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { notes, createNote, updateNote } = useVaultStore();
  const { noteId } = route.params as { noteId: string | null };

  const note = noteId ? notes.get(noteId) : null;
  const [title, setTitle] = useState(note?.title || "");
  const [content, setContent] = useState(note?.content || "");

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (note) {
        updateNote(note.id, `# ${title}\n\n${content}`);
      } else if (title || content) {
        createNote(`${title || "Untitled"}.md`, `# ${title}\n\n${content}`);
      }
    }, 1000);
    return () => clearTimeout(timeout);
  }, [title, content]);

  return (
    <ScrollView style={styles.container}>
      <TextInput
        style={styles.titleInput}
        value={title}
        onChangeText={setTitle}
        placeholder="Note title..."
        placeholderTextColor="#7a7a7a"
      />
      <TextInput
        style={styles.contentInput}
        value={content}
        onChangeText={setContent}
        placeholder="Start writing..."
        placeholderTextColor="#7a7a7a"
        multiline
        textAlignVertical="top"
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ffffff" },
  titleInput: {
    fontSize: 24,
    fontWeight: "bold",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
  },
  contentInput: {
    fontSize: 16,
    padding: 16,
    minHeight: 400,
    lineHeight: 24,
  },
});
