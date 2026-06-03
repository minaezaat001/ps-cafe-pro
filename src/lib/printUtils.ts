/**
 * printUtils.ts
 * Silent printing via hidden iframe using server-rendered receipt HTML.
 */

import { PrintSettings } from './usePrintSettings';

export async function printReceiptSilently(
  invoiceId: string,
  printSettings: PrintSettings
): Promise<void> {
  try {
    const res = await fetch(`/api/print/${invoiceId}?format=html`);
    if (!res.ok) throw new Error(`Failed to fetch receipt: ${res.status}`);
    const html = await res.text();

    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;opacity:0;';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) throw new Error('Cannot access iframe document');

    iframeDoc.open();
    iframeDoc.write(html);
    iframeDoc.close();

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Print timeout')), 10000);

      iframe.onload = () => {
        clearTimeout(timeout);
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          setTimeout(() => {
            try { document.body.removeChild(iframe); } catch {}
            resolve();
          }, 1500);
        } catch (e) {
          reject(e);
        }
      };
    });
  } catch (error) {
    console.error('[printReceiptSilently] Error:', error);
    throw error;
  }
}
