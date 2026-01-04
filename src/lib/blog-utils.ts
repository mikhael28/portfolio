/**
 * Processes HTML content to add captions below images.
 * Wraps images with their alt text in a figure element with a figcaption.
 */
export function addImageCaptions(html: string): string {
  // Match img tags with alt text
  // This regex captures the full img tag and extracts alt text
  const imgRegex = /<img\s+([^>]*?)alt="([^"]*?)"([^>]*?)>/gi;
  
  let result = html;
  const matches: Array<{ fullMatch: string; beforeAlt: string; altText: string; afterAlt: string; index: number }> = [];
  
  // Collect all matches first
  let match;
  while ((match = imgRegex.exec(html)) !== null) {
    const beforeAlt = match[1] || '';
    const altText = match[2] || '';
    const afterAlt = match[3] || '';
    const fullMatch = match[0];
    
    // Check if this image is already inside a figure tag
    const beforeContext = html.substring(Math.max(0, match.index - 200), match.index);
    const afterContext = html.substring(match.index + fullMatch.length, Math.min(html.length, match.index + fullMatch.length + 200));
    
    // Skip if already in a figure tag
    if (beforeContext.includes('<figure') && afterContext.includes('</figure>')) {
      continue;
    }
    
    if (altText && altText.trim()) {
      matches.push({
        fullMatch,
        beforeAlt,
        altText,
        afterAlt,
        index: match.index,
      });
    }
  }
  
  // Process matches in reverse order to maintain correct indices
  for (let i = matches.length - 1; i >= 0; i--) {
    const { fullMatch, beforeAlt, altText, afterAlt, index } = matches[i];
    const replacement = `<figure class="my-6">
        <img ${beforeAlt}alt="${altText}"${afterAlt}>
        <figcaption class="mt-2 text-sm text-center text-neutral-600 dark:text-neutral-400 italic">${altText}</figcaption>
      </figure>`;
    result = result.substring(0, index) + replacement + result.substring(index + fullMatch.length);
  }
  
  return result;
}

