import { listNativeAccessibilityPrinters, speakNativeAccessibilityPrompt } from './nativeVault';

const escapeHtml = (value) =>
  String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

export const inspectAccessibilityPrinters = async () => listNativeAccessibilityPrinters();

export const speakWhenRequested = async ({
  text,
  settings = {},
} = {}) =>
  speakNativeAccessibilityPrompt({
    text,
    enabled: Boolean(settings.accessibilityVoiceFeedbackEnabled),
    voice: settings.accessibilityVoiceName || '',
    rate: settings.accessibilityVoiceRate || 175,
  });

export const printAccessibleDocument = ({ title = 'ROS print output', body = '' } = {}) => {
  const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=900,height=1100');

  if (!printWindow) {
    throw new Error('Unable to open the print window. Check popup settings.');
  }

  printWindow.document.write(`
    <!doctype html>
    <html lang="en">
      <head>
        <title>${escapeHtml(title)}</title>
        <style>
          body { color: #111827; font-family: Arial, sans-serif; line-height: 1.55; margin: 32px; }
          h1 { font-size: 22px; margin: 0 0 18px; }
          pre { white-space: pre-wrap; word-break: break-word; font: inherit; }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(title)}</h1>
        <pre>${escapeHtml(body)}</pre>
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => printWindow.print(), 120);
};
