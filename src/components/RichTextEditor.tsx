import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import CodeBlock from '@tiptap/extension-code-block';
import Underline from '@tiptap/extension-underline';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import CharacterCount from '@tiptap/extension-character-count';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Youtube from '@tiptap/extension-youtube';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { useState, useRef } from 'react';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Link as LinkIcon,
  Image as ImageIcon,
  Code,
  List,
  ListOrdered,
  ListTodo,
  Heading1,
  Heading2,
  Heading3,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Quote,
  Minus,
  Palette,
  Highlighter,
  Eraser,
  Undo2,
  Redo2,
  Subscript as SubscriptIcon,
  Superscript as SuperscriptIcon,
  Youtube as YoutubeIcon,
} from 'lucide-react';
import { uploadToCloudinary } from '@/utils/cloudinary';
import { toast } from 'sonner';
import Callout from '@/components/extensions/Callout';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
}

const RichTextEditor = ({ content, onChange }: RichTextEditorProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [showYouTubeInput, setShowYouTubeInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const presetHighlightColors: string[] = [
    '#fde68a', // warm yellow
    '#bbf7d0', // green
    '#bae6fd', // light blue
    '#fca5a5', // light red
    '#e9d5ff', // purple
    '#fff7ed', // peach
  ];
  const presetTextColors: string[] = [
    '#111827', // gray-900
    '#6B7280', // gray-500
    '#1D4ED8', // blue-700
    '#DC2626', // red-600
    '#16A34A', // green-600
    '#9333EA', // purple-600
    '#EA580C', // orange-600
  ];

  // Callout controls state
  const [calloutBg, setCalloutBg] = useState<string>('#FEF3C7');
  const [calloutBorder, setCalloutBorder] = useState<string>('#F59E0B');
  const [calloutBorderWidth, setCalloutBorderWidth] = useState<number>(2);
  const [calloutRadius, setCalloutRadius] = useState<number>(16);
  const [calloutPadding, setCalloutPadding] = useState<number>(16);
  const [calloutSectionColor, setCalloutSectionColor] = useState<string>('#F59E0B');

  const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
    const normalized = hex.replace('#', '');
    const full = normalized.length === 3
      ? normalized.split('').map((c) => c + c).join('')
      : normalized;
    if (full.length !== 6) return null;
    const r = parseInt(full.substring(0, 2), 16);
    const g = parseInt(full.substring(2, 4), 16);
    const b = parseInt(full.substring(4, 6), 16);
    return { r, g, b };
  };

  const hexToRgbaString = (hex: string, alpha: number): string => {
    const rgb = hexToRgb(hex);
    if (!rgb) return hex; // fallback
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
  };

  const applyCallout = () => {
    editor?.chain().focus().setCallout({
      backgroundColor: calloutBg,
      borderColor: calloutBorder,
      borderWidth: `${calloutBorderWidth}px`,
      borderRadius: `${calloutRadius}px`,
      padding: `${calloutPadding}px`,
    }).run();
  };

const editor = useEditor({
  extensions: [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
    }),
    Underline,
    TextStyle,
    Color.configure({ types: [TextStyle.name, 'textStyle'] }),
    Highlight.configure({ multicolor: true }),
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    Placeholder.configure({ placeholder: 'Start typing…' }),
    Subscript,
    Superscript,
    TaskList,
    TaskItem,
    Callout,
    Image.configure({
      HTMLAttributes: { class: 'max-w-full h-auto rounded-lg' },
    }),
    Link.configure({
      openOnClick: false,
      HTMLAttributes: { class: 'text-blue-600 underline' },
    }),
    CodeBlock.configure({
      HTMLAttributes: { class: 'bg-gray-100 p-4 rounded-lg font-mono text-sm' },
    }),
    Table.configure({
      resizable: true,
      HTMLAttributes: { class: 'min-w-full border border-gray-300' },
    }),
    TableRow,
    TableHeader,
    TableCell,
    Youtube.configure({ controls: false, nocookie: true }),
    CharacterCount,
  ],
  content,
  onUpdate: ({ editor }) => {
    onChange(editor.getHTML());
  },
  editorProps: {
    attributes: {
      class: 'focus:outline-none min-h-[300px] p-4 rich-text-editor',
    },
  },
});

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const imageUrl = await uploadToCloudinary(file);
      if (!imageUrl) {
        toast.error('No image URL returned from Cloudinary');
        return;
      }
      editor?.chain().focus().setImage({ src: imageUrl }).run();
      toast.success('Image uploaded successfully!');
    } catch (error: any) {
      console.error('Image upload failed:', error);
      toast.error(error.message || 'Failed to upload image');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const addLink = () => {
    if (linkUrl && editor) {
      // If text is selected, apply link to selection
      if (editor.state.selection.empty) {
        toast.error('Please select text to create a link');
        return;
      }
      
      editor.chain().focus().setLink({ href: linkUrl }).run();
      setLinkUrl('');
      setShowLinkInput(false);
      toast.success('Link added successfully!');
    }
  };

  const handleHeadingClick = (level: 1 | 2 | 3) => {
    if (editor) {
      // Use the simple toggleHeading approach that works
      editor.chain().focus().toggleHeading({ level }).run();
    }
  };

  if (!editor) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Custom Styles for Editor */}
      <style dangerouslySetInnerHTML={{
        __html: `
          .rich-text-editor h1 {
            font-size: 2.5rem !important;
            font-weight: 800 !important;
            margin: 1rem 0 !important;
            color: #111827 !important;
            line-height: 1.2 !important;
            display: block !important;
          }
          .rich-text-editor h2 {
            font-size: 2rem !important;
            font-weight: 700 !important;
            margin: 0.75rem 0 !important;
            color: #1f2937 !important;
            line-height: 1.3 !important;
            display: block !important;
          }
          .rich-text-editor h3 {
            font-size: 1.5rem !important;
            font-weight: 600 !important;
            margin: 0.5rem 0 !important;
            color: #374151 !important;
            line-height: 1.4 !important;
            display: block !important;
          }
          .rich-text-editor .heading-1 {
            font-size: 2.25rem !important;
            font-weight: 700 !important;
            color: #1f2937 !important;
            line-height: 1.2 !important;
          }
          .rich-text-editor .heading-2 {
            font-size: 1.875rem !important;
            font-weight: 600 !important;
            color: #374151 !important;
            line-height: 1.3 !important;
          }
          .rich-text-editor .heading-3 {
            font-size: 1.5rem !important;
            font-weight: 600 !important;
            color: #4b5563 !important;
            line-height: 1.4 !important;
          }
          .rich-text-editor p {
            margin: 0.5rem 0 !important;
            line-height: 1.6 !important;
          }
          .rich-text-editor ul, .rich-text-editor ol {
            margin: 0.5rem 0 !important;
            padding-left: 1.5rem !important;
          }
          .rich-text-editor li {
            margin: 0.25rem 0 !important;
          }
          .rich-text-editor blockquote {
            border-left: 4px solid #e5e7eb !important;
            padding-left: 1rem !important;
            margin: 1rem 0 !important;
            font-style: italic !important;
          }
          .rich-text-editor code {
            background-color: #f3f4f6 !important;
            padding: 0.125rem 0.25rem !important;
            border-radius: 0.25rem !important;
            font-family: monospace !important;
          }
          .rich-text-editor pre {
            background-color: #f3f4f6 !important;
            padding: 1rem !important;
            border-radius: 0.5rem !important;
            overflow-x: auto !important;
          }
          .rich-text-editor a {
            color: #3b82f6 !important;
            text-decoration: underline !important;
          }
          .rich-text-editor img {
            max-width: 100% !important;
            height: auto !important;
            border-radius: 0.5rem !important;
          }
          .rich-text-editor table {
            border-collapse: collapse;
            width: 100%;
            margin: 1rem 0;
            table-layout: fixed;
          }
          .rich-text-editor th, .rich-text-editor td {
            border: 1px solid #d1d5db;
            padding: 8px;
            min-width: 40px;
            position: relative;
            vertical-align: top;
          }
          .rich-text-editor th {
            background: #f3f4f6;
            font-weight: bold;
          }
          .rich-text-editor .selectedCell:after {
            background: #e0f2fe;
            content: "";
            left: 0;
            right: 0;
            top: 0;
            bottom: 0;
            pointer-events: none;
            position: absolute;
            z-index: 2;
          }
          .rich-text-editor .column-resize-handle {
            background: #3b82f6;
            bottom: -1px;
            pointer-events: none;
            position: absolute;
            right: -1px;
            top: 0;
            width: 2px;
          }
          .rich-text-editor .tableWrapper {
            margin: 1.5rem 0;
            overflow-x: auto;
          }
          .rich-text-editor .resize-cursor {
            cursor: ew-resize;
            cursor: col-resize;
          }
        `
      }} />

{/* Toolbar */}
<div className="border rounded-lg p-3 bg-gray-50 flex flex-wrap gap-2 items-center">
  {/* Section: Format */}
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="outline" size="sm">Format</Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="start" className="w-56">
      <DropdownMenuLabel>Inline</DropdownMenuLabel>
      <div className="flex gap-1 p-2">
        <Button type="button" variant={editor.isActive('bold') ? 'default' : 'outline'} size="sm" onClick={() => editor.chain().focus().toggleBold().run()} title="Bold"><Bold className="w-4 h-4" /></Button>
        <Button type="button" variant={editor.isActive('italic') ? 'default' : 'outline'} size="sm" onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic"><Italic className="w-4 h-4" /></Button>
        <Button type="button" variant={editor.isActive('underline') ? 'default' : 'outline'} size="sm" onClick={() => editor.chain().focus().toggleUnderline().run()} title="Underline"><UnderlineIcon className="w-4 h-4" /></Button>
        <Button type="button" variant={editor.isActive('code') ? 'default' : 'outline'} size="sm" onClick={() => editor.chain().focus().toggleCode().run()} title="Code"><Code className="w-4 h-4" /></Button>
      </div>
      <DropdownMenuSeparator />
      <DropdownMenuLabel>Block</DropdownMenuLabel>
      <div className="flex gap-1 p-2">
        <Button size="sm" variant={editor.isActive('heading', { level: 1 }) ? 'default' : 'outline'} onClick={() => handleHeadingClick(1)}>H1</Button>
        <Button size="sm" variant={editor.isActive('heading', { level: 2 }) ? 'default' : 'outline'} onClick={() => handleHeadingClick(2)}>H2</Button>
        <Button size="sm" variant={editor.isActive('heading', { level: 3 }) ? 'default' : 'outline'} onClick={() => handleHeadingClick(3)}>H3</Button>
        <Button size="sm" variant="outline" onClick={() => editor.chain().focus().setParagraph().run()}>P</Button>
      </div>
      <DropdownMenuSeparator />
      <DropdownMenuLabel>Sub/Superscript</DropdownMenuLabel>
      <div className="flex gap-1 p-2">
        <Button size="sm" variant={editor.isActive('subscript') ? 'default' : 'outline'} onClick={() => editor.chain().focus().toggleSubscript().run()}>x</Button>
        <Button size="sm" variant={editor.isActive('superscript') ? 'default' : 'outline'} onClick={() => editor.chain().focus().toggleSuperscript().run()}>x</Button>
      </div>
    </DropdownMenuContent>
  </DropdownMenu>

  {/* Section: Paragraph */}
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="outline" size="sm">Paragraph</Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="start" className="w-60">
      <DropdownMenuLabel>Alignment</DropdownMenuLabel>
      <div className="flex gap-1 p-2">
        <Button size="sm" variant={editor.isActive({ textAlign: 'left' }) ? 'default' : 'outline'} onClick={() => editor.chain().focus().setTextAlign('left').run()}><AlignLeft className="w-4 h-4" /></Button>
        <Button size="sm" variant={editor.isActive({ textAlign: 'center' }) ? 'default' : 'outline'} onClick={() => editor.chain().focus().setTextAlign('center').run()}><AlignCenter className="w-4 h-4" /></Button>
        <Button size="sm" variant={editor.isActive({ textAlign: 'right' }) ? 'default' : 'outline'} onClick={() => editor.chain().focus().setTextAlign('right').run()}><AlignRight className="w-4 h-4" /></Button>
        <Button size="sm" variant={editor.isActive({ textAlign: 'justify' }) ? 'default' : 'outline'} onClick={() => editor.chain().focus().setTextAlign('justify').run()}><AlignJustify className="w-4 h-4" /></Button>
      </div>
      <DropdownMenuSeparator />
      <DropdownMenuLabel>Lists</DropdownMenuLabel>
      <div className="flex gap-1 p-2">
        <Button size="sm" variant={editor.isActive('bulletList') ? 'default' : 'outline'} onClick={() => editor.chain().focus().toggleBulletList().run()}><List className="w-4 h-4" /></Button>
        <Button size="sm" variant={editor.isActive('orderedList') ? 'default' : 'outline'} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered className="w-4 h-4" /></Button>
        <Button size="sm" variant={editor.isActive('taskList') ? 'default' : 'outline'} onClick={() => editor.chain().focus().toggleTaskList().run()}><ListTodo className="w-4 h-4" /></Button>
      </div>
      <DropdownMenuSeparator />
      <DropdownMenuLabel>Quotes & Rules</DropdownMenuLabel>
      <div className="flex gap-1 p-2">
        <Button size="sm" variant={editor.isActive('blockquote') ? 'default' : 'outline'} onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote className="w-4 h-4" /></Button>
        <Button size="sm" variant="outline" onClick={() => editor.chain().focus().setHorizontalRule().run()}><Minus className="w-4 h-4" /></Button>
      </div>
    </DropdownMenuContent>
  </DropdownMenu>

  {/* Section: Colors */}
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="outline" size="sm">Colors</Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="start" className="w-64">
      <DropdownMenuLabel>Text</DropdownMenuLabel>
      <div className="flex items-center gap-2 p-2">
    <input type="color" onChange={(e) => editor.chain().focus().setColor(e.target.value).run()} title="Text color" />
        <div className="flex items-center gap-1">
          {presetTextColors.map((c) => (
            <button key={c} type="button" className="h-5 w-5 rounded-full border" style={{ backgroundColor: c }} onClick={() => editor.chain().focus().setColor(c).run()} />
          ))}
        </div>
      </div>
      <DropdownMenuLabel>Highlight</DropdownMenuLabel>
      <div className="flex items-center gap-2 p-2">
    <input type="color" onChange={(e) => editor.chain().focus().setHighlight({ color: e.target.value }).run()} title="Highlight color" />
        <div className="flex items-center gap-1">
          {presetHighlightColors.map((c) => (
            <button key={c} type="button" className="h-6 w-6 rounded border" style={{ backgroundColor: c }} onClick={() => editor.chain().focus().setHighlight({ color: c }).run()} />
          ))}
        </div>
      </div>
      <DropdownMenuSeparator />
      <DropdownMenuItem onSelect={(e) => { e.preventDefault(); editor.chain().focus().unsetColor().unsetHighlight().run(); }}>Clear colors</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>

  {/* Section: Insert */}
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="outline" size="sm">Insert</Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="start" className="w-56">
      <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setShowLinkInput(true); }}>Link</DropdownMenuItem>
      <DropdownMenuItem onSelect={(e) => { e.preventDefault(); fileInputRef.current?.click(); }}>Image</DropdownMenuItem>
      <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setShowYouTubeInput(true); }}>YouTube</DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem onSelect={(e) => { e.preventDefault(); editor.chain().focus().toggleCodeBlock().run(); }}>Code block</DropdownMenuItem>
      <DropdownMenuItem onSelect={(e) => { e.preventDefault(); editor.chain().focus().toggleBlockquote().run(); }}>Blockquote</DropdownMenuItem>
      <DropdownMenuItem onSelect={(e) => { e.preventDefault(); editor.chain().focus().setHorizontalRule().run(); }}>Horizontal rule</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />

  {/* Section: Table */}
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="outline" size="sm">Table</Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="start" className="w-56">
      <DropdownMenuItem onSelect={(e) => { e.preventDefault(); editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(); }}>Insert 3x3</DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuLabel>Columns</DropdownMenuLabel>
      <DropdownMenuItem onSelect={(e) => { e.preventDefault(); editor.chain().focus().addColumnBefore().run(); }}>Add col before</DropdownMenuItem>
      <DropdownMenuItem onSelect={(e) => { e.preventDefault(); editor.chain().focus().addColumnAfter().run(); }}>Add col after</DropdownMenuItem>
      <DropdownMenuItem onSelect={(e) => { e.preventDefault(); editor.chain().focus().deleteColumn().run(); }}>Delete column</DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuLabel>Rows</DropdownMenuLabel>
      <DropdownMenuItem onSelect={(e) => { e.preventDefault(); editor.chain().focus().addRowBefore().run(); }}>Add row before</DropdownMenuItem>
      <DropdownMenuItem onSelect={(e) => { e.preventDefault(); editor.chain().focus().addRowAfter().run(); }}>Add row after</DropdownMenuItem>
      <DropdownMenuItem onSelect={(e) => { e.preventDefault(); editor.chain().focus().deleteRow().run(); }}>Delete row</DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem onSelect={(e) => { e.preventDefault(); editor.chain().focus().toggleHeaderRow().run(); }}>Toggle header row</DropdownMenuItem>
      <DropdownMenuItem onSelect={(e) => { e.preventDefault(); editor.chain().focus().toggleHeaderColumn().run(); }}>Toggle header col</DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem onSelect={(e) => { e.preventDefault(); editor.chain().focus().deleteTable().run(); }}>Delete table</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>

  {/* Section: Callout */}
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant={editor.isActive('callout') ? 'default' : 'outline'} size="sm">Callout</Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="start" className="w-64">
      <div className="p-2 space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-xs">Section</span>
          <input type="color" value={calloutSectionColor} onChange={(e) => { const chosen = e.target.value; setCalloutSectionColor(chosen); const translucent = hexToRgbaString(chosen, 0.25); setCalloutBorder(chosen); setCalloutBg(translucent); applyCallout(); }} />
        </div>
        <div className="flex items-center gap-2">
          <input type="number" min={0} max={16} value={calloutBorderWidth} onChange={(e) => { setCalloutBorderWidth(parseInt(e.target.value || '0', 10)); applyCallout(); }} className="w-20 border rounded px-2 py-1 text-sm" placeholder="Border" />
          <input type="number" min={0} max={40} value={calloutRadius} onChange={(e) => { setCalloutRadius(parseInt(e.target.value || '0', 10)); applyCallout(); }} className="w-20 border rounded px-2 py-1 text-sm" placeholder="Radius" />
          <input type="number" min={4} max={48} value={calloutPadding} onChange={(e) => { setCalloutPadding(parseInt(e.target.value || '0', 10)); applyCallout(); }} className="w-20 border rounded px-2 py-1 text-sm" placeholder="Padding" />
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => editor.chain().focus().unsetCallout().run()}>Remove</Button>
      </div>
    </DropdownMenuContent>
  </DropdownMenu>

  {/* Section: Undo/Redo/Clear */}
  <Button type="button" variant="outline" size="sm" onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()} title="Clear formatting"><Eraser className="w-4 h-4" /></Button>
  <Button type="button" variant="outline" size="sm" onClick={() => editor.commands.undo()} title="Undo"><Undo2 className="w-4 h-4" /></Button>
  <Button type="button" variant="outline" size="sm" onClick={() => editor.commands.redo()} title="Redo"><Redo2 className="w-4 h-4" /></Button>
</div>

{/* Link Input */}
{showLinkInput && (
  <div className="flex gap-2 p-3 bg-blue-50 rounded-lg items-center">
    <Input
      type="url"
      placeholder="Enter URL..."
      value={linkUrl}
      onChange={(e) => setLinkUrl(e.target.value)}
      onKeyDown={(e) => e.key === 'Enter' && addLink()}
      autoFocus
    />
    <Button onClick={addLink} size="sm">Add Link</Button>
    <Button onClick={() => setShowLinkInput(false)} variant="outline" size="sm">Cancel</Button>
  </div>
)}

{/* YouTube Input */}
{showYouTubeInput && (
  <div className="flex gap-2 p-3 bg-red-50 rounded-lg items-center">
    <Input
      type="url"
      placeholder="Paste YouTube URL..."
      value={youtubeUrl}
      onChange={(e) => setYoutubeUrl(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          editor?.commands.setYoutubeVideo({ src: youtubeUrl, width: 640, height: 480 });
          setYoutubeUrl('');
          setShowYouTubeInput(false);
        }
      }}
      autoFocus
    />
    <Button size="sm" onClick={() => { editor?.commands.setYoutubeVideo({ src: youtubeUrl, width: 640, height: 480 }); setYoutubeUrl(''); setShowYouTubeInput(false); }}>Embed</Button>
    <Button size="sm" variant="outline" onClick={() => setShowYouTubeInput(false)}>Cancel</Button>
  </div>
)}

{/* Editor with scrollable content area */}
<div className="rounded-lg max-h-[60vh] overflow-auto">
  <EditorContent editor={editor} />
</div>

{/* Character Count */}
<div className="text-xs text-muted-foreground flex justify-end">
  <span>{editor.storage.characterCount.characters()} characters</span>
</div>
    </div>
  );
};

export default RichTextEditor;
