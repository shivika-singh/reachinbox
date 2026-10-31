import {
  Bold, Italic, List, ListOrdered, Redo2, Strikethrough, Underline, Undo2, type LucideIcon,
} from 'lucide-react';
import { useRef } from 'react';

const TOOLS: { cmd: string; icon: LucideIcon; label: string }[] = [
  { cmd: 'undo', icon: Undo2, label: 'Undo' },
  { cmd: 'redo', icon: Redo2, label: 'Redo' },
  { cmd: 'bold', icon: Bold, label: 'Bold' },
  { cmd: 'italic', icon: Italic, label: 'Italic' },
  { cmd: 'underline', icon: Underline, label: 'Underline' },
  { cmd: 'strikeThrough', icon: Strikethrough, label: 'Strikethrough' },
  { cmd: 'insertUnorderedList', icon: List, label: 'Bulleted list' },
  { cmd: 'insertOrderedList', icon: ListOrdered, label: 'Numbered list' },
];

interface Props { onChange: (html: string, text: string) => void }

export function RichTextEditor({ onChange }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const emit = () => onChange(ref.current?.innerHTML ?? '', ref.current?.innerText ?? '');

  const run = (cmd: string) => {
    ref.current?.focus();
    document.execCommand(cmd);
    emit();
  };

  return (
    <div className="overflow-hidden rounded-md border border-line">
      <div className="flex flex-wrap items-center gap-1 border-b border-line bg-gray-50 px-2 py-1.5" role="toolbar" aria-label="Formatting">
        {TOOLS.map(({ cmd, icon: Icon, label }) => (
          <button
            key={cmd}
            type="button"
            title={label}
            aria-label={label}
            onMouseDown={(e) => e.preventDefault()} // keep the text selection
            onClick={() => run(cmd)}
            className="rounded p-1.5 text-ink-soft hover:bg-gray-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
          >
            <Icon className="h-4 w-4" />
          </button>
        ))}
      </div>
      <div
        ref={ref}
        className="editor min-h-[260px] px-4 py-3 text-sm leading-relaxed"
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label="Email body"
        data-placeholder="Type your email here..."
        onInput={emit}
      />
    </div>
  );
}
