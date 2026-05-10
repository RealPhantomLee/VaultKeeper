import { useEffect, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Underline from "@tiptap/extension-underline";
import Typography from "@tiptap/extension-typography";
import { Note } from "@vaultkeeper/types";
import { useVaultStore } from "@stores/vault";
import { EditorToolbar } from "./EditorToolbar";
import { parseMarkdown, serializeMarkdown } from "@utils/markdown";

export function NoteEditor({ note }: { note: Note }) {
  const { updateNote } = useVaultStore();
  const [isPreview, setIsPreview] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4, 5, 6] },
      }),
      Link.configure({
        openOnClick: false,
        linkOnPaste: true,
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Underline,
      Typography,
    ],
    content: parseMarkdown(note.content),
    onUpdate: ({ editor }) => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        const content = serializeMarkdown(editor.getHTML());
        updateNote(note.id, content);
      }, 500);
    },
  });

  useEffect(() => {
    if (editor && note.content) {
      const currentContent = editor.getHTML();
      const newContent = parseMarkdown(note.content);
      if (currentContent !== newContent) {
        editor.commands.setContent(newContent);
      }
    }
  }, [note.id, editor, note.content]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  return (
    <div className="h-full flex flex-col" id={`editor-${note.id}`} role="tabpanel">
      <EditorToolbar editor={editor} isPreview={isPreview} onTogglePreview={setIsPreview} />
      <div className="flex-1 overflow-auto">
        {isPreview ? (
          <div
            className="prose max-w-none p-8"
            dangerouslySetInnerHTML={{ __html: parseMarkdown(note.content) }}
          />
        ) : (
          <EditorContent editor={editor} className="h-full" />
        )}
      </div>
    </div>
  );
}
