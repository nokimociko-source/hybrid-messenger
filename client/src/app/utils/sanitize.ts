const MAX_TAG_NESTING = 100;

const permittedHtmlTags = [
  'font',
  'del',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'blockquote',
  'p',
  'a',
  'ul',
  'ol',
  'sup',
  'sub',
  'li',
  'b',
  'i',
  'u',
  'strong',
  'em',
  'strike',
  's',
  'code',
  'hr',
  'br',
  'div',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
  'caption',
  'pre',
  'span',
  'img',
  'details',
  'summary',
];

const urlSchemes = ['https', 'http', 'ftp', 'mailto', 'magnet'];

const permittedTagToAttributes = {
  font: ['style', 'data-mx-bg-color', 'data-mx-color', 'color'],
  span: [
    'style',
    'data-mx-bg-color',
    'data-mx-color',
    'data-mx-spoiler',
    'data-mx-maths',
    'data-mx-pill',
    'data-mx-ping',
    'data-md',
  ],
  div: ['data-mx-maths'],
  blockquote: ['data-md'],
  h1: ['data-md'],
  h2: ['data-md'],
  h3: ['data-md'],
  h4: ['data-md'],
  h5: ['data-md'],
  h6: ['data-md'],
  pre: ['data-md', 'class'],
  ol: ['start', 'type', 'data-md'],
  ul: ['data-md'],
  a: ['name', 'target', 'href', 'rel', 'data-md'],
  img: ['width', 'height', 'alt', 'title', 'src', 'data-mx-emoticon'],
  code: ['class', 'data-md'],
  strong: ['data-md'],
  i: ['data-md'],
  em: ['data-md'],
  u: ['data-md'],
  s: ['data-md'],
  del: ['data-md'],
};

function isSafeUrl(url: string, schemes: string[]) {
  try {
    const parsed = new URL(url, window.location.origin);
    const scheme = parsed.protocol.replace(':', '');
    return schemes.includes(scheme);
  } catch {
    return false;
  }
}

function sanitizeStyle(value: string): string {
  const rules = value
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);

  const allowed = new Map<string, string>();
  for (const rule of rules) {
    const [propRaw, valRaw] = rule.split(':').map((s) => s.trim());
    const prop = (propRaw || '').toLowerCase();
    const val = valRaw || '';
    if (!prop || !val) continue;

    if ((prop === 'color' || prop === 'background-color') && /^#(?:[0-9a-fA-F]{3}){1,2}$/.test(val)) {
      allowed.set(prop, val);
    }
  }

  return Array.from(allowed.entries())
    .map(([k, v]) => `${k}: ${v}`)
    .join('; ');
}

function sanitizeCustomHtmlTree(root: HTMLElement) {
  const stack: Array<{ node: Node; depth: number }> = [{ node: root, depth: 0 }];

  while (stack.length > 0) {
    const cur = stack.pop();
    if (!cur) break;
    const { node, depth } = cur;

    if (depth > MAX_TAG_NESTING) {
      node.parentNode?.removeChild(node);
      continue;
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      const tag = el.tagName.toLowerCase();

      if (['style', 'script', 'textarea', 'option', 'noscript', 'mx-reply'].includes(tag)) {
        el.parentNode?.removeChild(el);
        continue;
      }

      if (!permittedHtmlTags.includes(tag)) {
        const parent = el.parentNode;
        if (parent) {
          while (el.firstChild) parent.insertBefore(el.firstChild, el);
          parent.removeChild(el);
        }
        continue;
      }

      const allowedAttrs = (permittedTagToAttributes as Record<string, string[]>)[tag] || [];
      for (const attr of Array.from(el.attributes)) {
        if (!allowedAttrs.includes(attr.name)) {
          el.removeAttribute(attr.name);
          continue;
        }

        if (attr.name === 'href') {
          if (!isSafeUrl(attr.value, urlSchemes)) el.setAttribute('href', '#');
        }

        if (attr.name === 'style') {
          const safeStyle = sanitizeStyle(attr.value);
          if (safeStyle) el.setAttribute('style', safeStyle);
          else el.removeAttribute('style');
        }

        if (tag === 'img' && attr.name === 'src') {
          const src = attr.value;
          if (typeof src === 'string' && src.startsWith('mxc://') === false) {
            const link = document.createElement('a');
            link.setAttribute('href', src);
            link.setAttribute('rel', 'noreferrer noopener');
            link.setAttribute('target', '_blank');
            link.textContent = el.getAttribute('alt') || src;
            el.replaceWith(link);
            break;
          }
        }
      }

      if (tag === 'a') {
        el.setAttribute('rel', 'noreferrer noopener');
        el.setAttribute('target', '_blank');
      }

      if (tag === 'font' || tag === 'span') {
        const bg = el.getAttribute('data-mx-bg-color') || '';
        const fg = el.getAttribute('data-mx-color') || '';
        const style = sanitizeStyle(`background-color: ${bg}; color: ${fg}`);
        if (style) el.setAttribute('style', style);
      }
    }

    for (const child of Array.from(node.childNodes)) {
      stack.push({ node: child, depth: depth + 1 });
    }
  }
}

export const sanitizeCustomHtml = (customHtml: string): string => {
  const doc = new DOMParser().parseFromString(customHtml || '', 'text/html');
  sanitizeCustomHtmlTree(doc.body);
  return doc.body.innerHTML;
};

export const sanitizeText = (body: string) => {
  const tagsToReplace: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return body.replace(/[&<>'"]/g, (tag) => tagsToReplace[tag] || tag);
};

export const sanitizeEmbedHtml = (embedHtml: string): string => {
  const doc = new DOMParser().parseFromString(embedHtml || '', 'text/html');
  const allowed = new Set(['iframe', 'blockquote', 'a']);

  const stack: Array<{ node: Node; depth: number }> = [{ node: doc.body, depth: 0 }];
  while (stack.length > 0) {
    const cur = stack.pop();
    if (!cur) break;
    const { node, depth } = cur;

    if (depth > MAX_TAG_NESTING) {
      node.parentNode?.removeChild(node);
      continue;
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      const tag = el.tagName.toLowerCase();

      if (!allowed.has(tag)) {
        el.parentNode?.removeChild(el);
        continue;
      }

      for (const attr of Array.from(el.attributes)) {
        const name = attr.name;

        if (tag === 'iframe') {
          if (!['width', 'height', 'src', 'frameborder', 'allow', 'allowfullscreen', 'title'].includes(name)) {
            el.removeAttribute(name);
            continue;
          }
          if (name === 'src') {
            const src = attr.value;
            const safe = src.startsWith('https://www.youtube.com/embed/') || src.startsWith('https://player.vimeo.com/video/');
            if (!safe) {
              el.parentNode?.removeChild(el);
              break;
            }
          }
        }

        if (tag === 'blockquote') {
          if (name !== 'class') {
            el.removeAttribute(name);
            continue;
          }
          if (attr.value !== 'twitter-tweet') {
            el.removeAttribute('class');
          }
        }

        if (tag === 'a') {
          if (name !== 'href') {
            el.removeAttribute(name);
            continue;
          }
          if (!isSafeUrl(attr.value, ['https', 'http'])) el.setAttribute('href', '#');
        }
      }

      if (tag === 'a') {
        el.setAttribute('rel', 'noreferrer noopener');
        el.setAttribute('target', '_blank');
      }
    }

    for (const child of Array.from(node.childNodes)) {
      stack.push({ node: child, depth: depth + 1 });
    }
  }

  return doc.body.innerHTML;
};
