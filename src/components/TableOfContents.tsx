import React, { useEffect, useMemo, useState } from 'react';

interface TocItem {
  id: string;
  text: string;
  level: number; // 1,2,3...
}

export interface TableOfContentsProps {
  containerRef: React.RefObject<HTMLElement>;
  minLevel?: number; // minimum heading level to include
  maxLevel?: number; // maximum heading level to include
  title?: string;
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

const TableOfContents: React.FC<TableOfContentsProps> = ({
  containerRef,
  minLevel = 1,
  maxLevel = 3,
  title = 'Table of contents',
}) => {
  const [items, setItems] = useState<TocItem[]>([]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const headingSelector = Array.from({ length: maxLevel - minLevel + 1 })
      .map((_, i) => `h${i + minLevel}`)
      .join(',');

    const headings = Array.from(el.querySelectorAll<HTMLHeadingElement>(headingSelector));

    // Build map to ensure unique IDs
    const usedIds = new Map<string, number>();
    const newItems: TocItem[] = headings.map((h) => {
      if (!h.id || h.id.trim() === '') {
        const base = slugify(h.textContent || 'heading');
        const count = usedIds.get(base) ?? 0;
        const next = count === 0 ? base : `${base}-${count + 1}`;
        usedIds.set(base, count + 1);
        h.id = next;
      }
      const level = Number(h.tagName.replace('H', ''));
      return { id: h.id, text: h.textContent || '', level };
    });

    setItems(newItems);
  }, [containerRef, minLevel, maxLevel, (containerRef.current as any)?.innerHTML]);

  const handleClick = (id: string) => {
    const target = document.getElementById(id);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Update URL hash without jumping
      history.replaceState(null, '', `#${id}`);
    }
  };

  if (items.length === 0) return null;

  return (
    <nav aria-label="Table of contents" className="border rounded-lg bg-gray-50 p-4">
      <h2 className="text-sm font-semibold mb-2">{title}</h2>
      <ul className="space-y-1 text-sm">
        {items.map((item) => (
          <li key={item.id} className={item.level === 1 ? '' : item.level === 2 ? 'pl-3' : 'pl-6'}>
            <button
              onClick={() => handleClick(item.id)}
              className="text-blue-600 hover:underline text-left"
            >
              {item.text}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default TableOfContents;
