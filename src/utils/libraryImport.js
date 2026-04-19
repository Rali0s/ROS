import JSZip from 'jszip';

const xmlParser = new DOMParser();
const textEncoder = new TextEncoder();

const toArray = (value) => (Array.isArray(value) ? value : value ? [value] : []);

const escapeHtml = (value = '') =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const bytesToBase64 = (bytes) => {
  let binary = '';
  const chunkSize = 0x8000;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }

  return btoa(binary);
};

const readBytes = async (file) => new Uint8Array(await file.arrayBuffer());

const buildDataUrl = (mimeType, bytes) => `data:${mimeType};base64,${bytesToBase64(bytes)}`;

const firstText = (root, selectors = []) => {
  for (const selector of selectors) {
    const match = root.querySelector(selector);
    const text = match?.textContent?.trim();

    if (text) {
      return text;
    }
  }

  return '';
};

const allText = (root, selector) =>
  Array.from(root.querySelectorAll(selector))
    .map((node) => node.textContent?.trim())
    .filter(Boolean);

const sanitizeDocToHtml = (markup) => {
  const document = xmlParser.parseFromString(markup, 'application/xhtml+xml');
  const body = document.querySelector('body');

  if (!body) {
    return '';
  }

  const blocks = Array.from(body.querySelectorAll('h1, h2, h3, h4, h5, h6, p, li, blockquote, pre'));

  if (!blocks.length) {
    const text = body.textContent?.trim();
    return text ? `<p>${escapeHtml(text)}</p>` : '';
  }

  return blocks
    .map((node) => {
      const tagName = node.tagName?.toLowerCase();
      const content = escapeHtml(node.textContent?.replace(/\s+/g, ' ').trim() || '');

      if (!content) {
        return '';
      }

      if (tagName === 'li') {
        return `<p>&bull; ${content}</p>`;
      }

      if (tagName === 'pre') {
        return `<pre>${content}</pre>`;
      }

      return `<${tagName}>${content}</${tagName}>`;
    })
    .filter(Boolean)
    .join('');
};

const extractPdfValue = (source, key) => {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const directMatch = source.match(new RegExp(`/${escapedKey}\\s*\\(([^)]*)\\)`));

  if (directMatch?.[1]) {
    return directMatch[1].replace(/\\([()\\])/g, '$1').trim();
  }

  const xmpMatch = source.match(new RegExp(`<dc:${escapedKey.toLowerCase()}[^>]*>([\\s\\S]*?)<\\/dc:${escapedKey.toLowerCase()}>`, 'i'));

  if (xmpMatch?.[1]) {
    return xmpMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  return '';
};

const extractPdfKeywords = (source) => {
  const keywords = extractPdfValue(source, 'Keywords');
  return keywords
    .split(/[;,]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
};

const extractIdentifiers = (root) => {
  const directIdentifiers = Array.from(root.querySelectorAll('metadata > identifier, metadata > dc\\:identifier')).map((node) => {
    const scheme =
      node.getAttribute('opf:scheme') ||
      node.getAttribute('scheme') ||
      node.getAttribute('id') ||
      'identifier';

    return `${scheme}:${node.textContent?.trim() || ''}`;
  });

  const metaIdentifiers = Array.from(root.querySelectorAll('meta[property="identifier"], meta[name="identifier"]'))
    .map((node) => node.textContent?.trim() || node.getAttribute('content')?.trim())
    .filter(Boolean);

  return [...directIdentifiers, ...metaIdentifiers].filter(Boolean);
};

const extractCalibreMeta = (root) => {
  const getMetaContent = (name) =>
    root.querySelector(`meta[name="${name}"]`)?.getAttribute('content')?.trim() ||
    root.querySelector(`meta[property="${name}"]`)?.textContent?.trim() ||
    '';

  return {
    series: getMetaContent('calibre:series') || getMetaContent('belongs-to-collection'),
    seriesIndex: getMetaContent('calibre:series_index') || getMetaContent('group-position'),
  };
};

const joinPath = (basePath, relativePath) => {
  if (!relativePath) {
    return '';
  }

  const segments = `${basePath}/${relativePath}`.split('/');
  const resolved = [];

  for (const segment of segments) {
    if (!segment || segment === '.') {
      continue;
    }

    if (segment === '..') {
      resolved.pop();
      continue;
    }

    resolved.push(segment);
  }

  return resolved.join('/');
};

const parseOpfDocument = async (markup, sourceLabel, zip = null, opfPath = '') => {
  const document = xmlParser.parseFromString(markup, 'application/xml');
  const metadataRoot = document.querySelector('metadata') || document;
  const manifestItems = Array.from(document.querySelectorAll('manifest > item'));
  const manifestById = Object.fromEntries(
    manifestItems.map((item) => [
      item.getAttribute('id'),
      {
        href: item.getAttribute('href') || '',
        mediaType: item.getAttribute('media-type') || '',
        properties: item.getAttribute('properties') || '',
      },
    ]),
  );

  const baseDirectory = opfPath.includes('/') ? opfPath.split('/').slice(0, -1).join('/') : '';
  const authors = allText(metadataRoot, 'creator, dc\\:creator');
  const tags = allText(metadataRoot, 'subject, dc\\:subject');
  const identifiers = extractIdentifiers(document);
  const calibreMeta = extractCalibreMeta(document);

  let coverDataUrl = '';
  let sections = [];

  if (zip) {
    const coverId =
      document.querySelector('meta[name="cover"]')?.getAttribute('content') ||
      manifestItems.find((item) => item.getAttribute('properties')?.includes('cover-image'))?.getAttribute('id');
    const coverItem = coverId ? manifestById[coverId] : null;

    if (coverItem?.href) {
      const coverPath = joinPath(baseDirectory, coverItem.href);
      const coverFile = zip.file(coverPath);

      if (coverFile) {
        const bytes = new Uint8Array(await coverFile.async('uint8array'));
        coverDataUrl = buildDataUrl(coverItem.mediaType || 'image/jpeg', bytes);
      }
    }

    const spineRefs = Array.from(document.querySelectorAll('spine > itemref'))
      .map((item) => item.getAttribute('idref'))
      .filter(Boolean);

    sections = (
      await Promise.all(
        spineRefs.map(async (idref, index) => {
          const manifestItem = manifestById[idref];

          if (!manifestItem?.href) {
            return null;
          }

          const contentPath = joinPath(baseDirectory, manifestItem.href);
          const contentFile = zip.file(contentPath);

          if (!contentFile) {
            return null;
          }

          const html = await contentFile.async('string');
          const contentDocument = xmlParser.parseFromString(html, 'application/xhtml+xml');
          const title =
            contentDocument.querySelector('title')?.textContent?.trim() ||
            contentDocument.querySelector('h1, h2')?.textContent?.trim() ||
            `Section ${index + 1}`;
          const safeHtml = sanitizeDocToHtml(html);

          if (!safeHtml) {
            return null;
          }

          return {
            id: `${sourceLabel}-section-${index + 1}`,
            title,
            html: safeHtml,
          };
        }),
      )
    ).filter(Boolean);
  }

  return {
    title: firstText(metadataRoot, ['title', 'dc\\:title']) || sourceLabel,
    authors,
    tags,
    publisher: firstText(metadataRoot, ['publisher', 'dc\\:publisher']),
    language: firstText(metadataRoot, ['language', 'dc\\:language']),
    publishedAt: firstText(metadataRoot, ['date, dc\\:date']),
    description: firstText(metadataRoot, ['description', 'dc\\:description']),
    identifiers,
    series: calibreMeta.series,
    seriesIndex: calibreMeta.seriesIndex,
    coverDataUrl,
    sections,
  };
};

export const importPdfFile = async (file) => {
  const bytes = await readBytes(file);
  const latin1 = new TextDecoder('latin1').decode(bytes);

  return {
    title: extractPdfValue(latin1, 'Title') || file.name.replace(/\.pdf$/i, ''),
    authors: toArray(extractPdfValue(latin1, 'Author')),
    tags: extractPdfKeywords(latin1),
    publisher: extractPdfValue(latin1, 'Producer') || extractPdfValue(latin1, 'Creator'),
    language: '',
    publishedAt: extractPdfValue(latin1, 'CreationDate'),
    description: extractPdfValue(latin1, 'Subject'),
    identifiers: [],
    series: '',
    seriesIndex: '',
    coverDataUrl: '',
    bytes,
    mimeType: file.type || 'application/pdf',
  };
};

export const importEpubFile = async (file) => {
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const containerFile = zip.file('META-INF/container.xml');

  if (!containerFile) {
    throw new Error('EPUB container.xml was not found.');
  }

  const containerMarkup = await containerFile.async('string');
  const containerDocument = xmlParser.parseFromString(containerMarkup, 'application/xml');
  const opfPath =
    containerDocument.querySelector('rootfile')?.getAttribute('full-path') ||
    containerDocument.querySelector('rootfile')?.getAttribute('fullPath');

  if (!opfPath) {
    throw new Error('EPUB package document was not found.');
  }

  const opfFile = zip.file(opfPath);

  if (!opfFile) {
    throw new Error('EPUB package file is missing.');
  }

  const opfMarkup = await opfFile.async('string');
  const parsed = await parseOpfDocument(opfMarkup, file.name.replace(/\.epub$/i, ''), zip, opfPath);

  return {
    ...parsed,
    bytes: textEncoder.encode(JSON.stringify({ sections: parsed.sections || [] })),
    mimeType: 'application/vnd.osa.library+json',
  };
};

export const importOpfMetadataFile = async (file) => {
  const markup = await file.text();
  return parseOpfDocument(markup, file.name.replace(/\.opf$/i, ''));
};
