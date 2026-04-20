import { Node, mergeAttributes } from '@tiptap/core';

export interface CalloutAttributes {
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: string;
  borderRadius?: string;
  padding?: string;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    callout: {
      setCallout: (attrs?: CalloutAttributes) => ReturnType;
      unsetCallout: () => ReturnType;
    };
  }
}

const Callout = Node.create({
  name: 'callout',
  group: 'block',
  content: 'block+',
  draggable: false,
  selectable: true,
  defining: true,

  addAttributes() {
    return {
      backgroundColor: {
        default: '#FEF3C7', // amber-100
      },
      borderColor: {
        default: '#FACC15', // amber-400
      },
      borderWidth: {
        default: '2px',
      },
      borderRadius: {
        default: '16px',
      },
      padding: {
        default: '16px',
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="callout"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const styleParts: string[] = [];
    if (HTMLAttributes.backgroundColor) styleParts.push(`background-color: ${HTMLAttributes.backgroundColor}`);
    if (HTMLAttributes.borderColor || HTMLAttributes.borderWidth) {
      const width = HTMLAttributes.borderWidth ?? '2px';
      const color = HTMLAttributes.borderColor ?? '#00000033';
      styleParts.push(`border: ${width} solid ${color}`);
    }
    if (HTMLAttributes.borderRadius) styleParts.push(`border-radius: ${HTMLAttributes.borderRadius}`);
    if (HTMLAttributes.padding) styleParts.push(`padding: ${HTMLAttributes.padding}`);

    const style = styleParts.join('; ');
    const attrs = mergeAttributes(HTMLAttributes, { 'data-type': 'callout', style });
    // Remove attributes that we inlined into style to avoid duplication
    delete attrs.backgroundColor;
    delete attrs.borderColor;
    delete attrs.borderWidth;
    delete attrs.borderRadius;
    delete attrs.padding;

    return ['div', attrs, 0];
  },

  addCommands() {
    return {
      setCallout:
        (attrs) =>
        ({ chain, commands }) => {
          if (this.editor.isActive('callout')) {
            return commands.updateAttributes('callout', attrs ?? {});
          }
          return chain().wrapIn('callout', attrs ?? {}).run();
        },
      unsetCallout:
        () =>
        ({ commands }) => {
          return commands.lift('callout');
        },
    };
  },
});

export default Callout;


