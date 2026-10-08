/*
 * The rich-text editor.
 *
 * Deliberately constrained. The toolbar offers headings, emphasis, lists,
 * links, quotes, images and tables — and nothing else. There is no font picker,
 * no colour picker, no font size: the site's typography is the site's job, and
 * an editor that can override it is an editor that can make one article look
 * wrong in a way nobody notices until it is live.
 *
 * H1 is absent on purpose. The page already renders the article title as its
 * H1, and a second one is both a heading-order bug and an SEO one.
 *
 * Paste is cleaned on the way in, because the usual source is Word or another
 * website, and both carry a great deal of markup that would otherwise be
 * stripped server-side on save — leaving the editor showing something different
 * from what was stored.
 */

import { useEffect } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import {
  Bold, Heading2, Heading3, ImagePlus, Italic, Link2, List, ListOrdered,
  Quote, Redo2, Strikethrough, Undo2, Unlink,
} from 'lucide-react';

const Btn = ({ onClick, active, disabled, title, children }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={title}
    aria-label={title}
    aria-pressed={active ? 'true' : undefined}
    className="grid size-8 place-items-center rounded-md transition disabled:opacity-35"
    style={
      active
        ? { background: 'color-mix(in srgb, var(--color-brand) 14%, transparent)', color: 'var(--color-brand)' }
        : { color: 'var(--text-muted)' }
    }
  >
    {children}
  </button>
);

const Divider = () => (
  <span className="mx-0.5 h-5 w-px shrink-0" style={{ background: 'var(--line)' }} aria-hidden="true" />
);

export default function RichTextEditor({ value, onChange, onPickImage, placeholder }) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // The title above the editor is the page's H1.
        heading: { levels: [2, 3, 4] },
        codeBlock: false,
        horizontalRule: false,
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        // Matches what the server's sanitiser allows; anything else is stripped
        // on save, and the editor should not pretend otherwise.
        protocols: ['http', 'https', 'mailto', 'tel'],
      }),
      Image.configure({ inline: false, allowBase64: false }),
    ],
    content: value ?? '',
    editorProps: {
      attributes: {
        class: 'prose-admin min-h-[320px] px-4 py-3 focus:outline-none',
        'aria-label': 'Article content',
      },
    },
    onUpdate: ({ editor: e }) => onChange(e.getHTML()),
  });

  /*
   * Only replace the document when the incoming value genuinely differs from
   * what is on screen. Without the comparison, every keystroke round-trips
   * through the parent and resets the cursor to the start.
   */
  useEffect(() => {
    if (!editor) return;
    const incoming = value ?? '';
    if (incoming !== editor.getHTML()) {
      editor.commands.setContent(incoming, { emitUpdate: false });
    }
  }, [value, editor]);

  if (!editor) return null;

  const setLink = () => {
    const previous = editor.getAttributes('link').href ?? '';
    const url = window.prompt('Link address', previous);
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  const addImage = async () => {
    if (!onPickImage) return;
    const picked = await onPickImage();
    if (picked?.url) {
      editor.chain().focus().setImage({ src: picked.url, alt: picked.alt ?? '' }).run();
    }
  };

  return (
    <div className="overflow-hidden rounded-lg border" style={{ borderColor: 'var(--line-strong)' }}>
      <div
        className="flex flex-wrap items-center gap-0.5 border-b p-1.5"
        style={{ background: 'var(--surface-sunken)' }}
        role="toolbar"
        aria-label="Formatting"
      >
        <Btn title="Bold" active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold className="size-4" />
        </Btn>
        <Btn title="Italic" active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic className="size-4" />
        </Btn>
        <Btn title="Strikethrough" active={editor.isActive('strike')}
          onClick={() => editor.chain().focus().toggleStrike().run()}>
          <Strikethrough className="size-4" />
        </Btn>

        <Divider />

        <Btn title="Heading" active={editor.isActive('heading', { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
          <Heading2 className="size-4" />
        </Btn>
        <Btn title="Sub-heading" active={editor.isActive('heading', { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
          <Heading3 className="size-4" />
        </Btn>

        <Divider />

        <Btn title="Bulleted list" active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <List className="size-4" />
        </Btn>
        <Btn title="Numbered list" active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrdered className="size-4" />
        </Btn>
        <Btn title="Quote" active={editor.isActive('blockquote')}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}>
          <Quote className="size-4" />
        </Btn>

        <Divider />

        <Btn title="Add or edit a link" active={editor.isActive('link')} onClick={setLink}>
          <Link2 className="size-4" />
        </Btn>
        <Btn title="Remove link" disabled={!editor.isActive('link')}
          onClick={() => editor.chain().focus().unsetLink().run()}>
          <Unlink className="size-4" />
        </Btn>
        {onPickImage && (
          <Btn title="Insert an image" onClick={addImage}>
            <ImagePlus className="size-4" />
          </Btn>
        )}

        <Divider />

        <Btn title="Undo" disabled={!editor.can().undo()}
          onClick={() => editor.chain().focus().undo().run()}>
          <Undo2 className="size-4" />
        </Btn>
        <Btn title="Redo" disabled={!editor.can().redo()}
          onClick={() => editor.chain().focus().redo().run()}>
          <Redo2 className="size-4" />
        </Btn>
      </div>

      <div style={{ background: 'var(--surface-card)' }}>
        {editor.isEmpty && placeholder && (
          <p className="pointer-events-none absolute px-4 py-3 text-[14px] text-muted">
            {placeholder}
          </p>
        )}
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
