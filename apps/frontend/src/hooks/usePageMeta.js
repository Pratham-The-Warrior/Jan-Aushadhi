// ============================================================
// usePageMeta — per-page <title>, description and structured data
// Gives every route a meaningful browser-tab / history / bookmark
// title and lets pages publish schema.org JSON-LD.
// ============================================================

import { useEffect } from 'react';

const SITE = 'JanAushadhi';
const DEFAULT_DESCRIPTION =
  'Compare your branded medicine with its Jan Aushadhi generic: same salt and strength, up to 90% cheaper. Find the nearest Jan Aushadhi Kendra.';

function setMeta(selector, attr, value) {
  const el = document.head.querySelector(selector);
  if (el) el.setAttribute(attr, value);
}

/**
 * @param {object}  meta
 * @param {string}  meta.title         Page title (site name is appended)
 * @param {string}  [meta.description] Meta description for search and sharing
 * @param {object}  [meta.jsonLd]      schema.org object, injected as JSON-LD
 */
export default function usePageMeta({ title, description, jsonLd } = {}) {
  const jsonLdText = jsonLd ? JSON.stringify(jsonLd) : '';

  useEffect(() => {
    const fullTitle = title ? `${title} · ${SITE}` : `${SITE} — Find cheaper generic medicines near you`;
    const desc = description || DEFAULT_DESCRIPTION;
    document.title = fullTitle;
    setMeta('meta[name="description"]', 'content', desc);
    setMeta('meta[property="og:title"]', 'content', fullTitle);
    setMeta('meta[property="og:description"]', 'content', desc);
  }, [title, description]);

  useEffect(() => {
    if (!jsonLdText) return undefined;
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = jsonLdText;
    document.head.appendChild(script);
    return () => script.remove();
  }, [jsonLdText]);
}
