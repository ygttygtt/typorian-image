export interface Range {
  from: number;
  to: number;
}

/**
 * Extract all code block and inline code ranges from content.
 * Ranges are sorted by `from` position (natural scan order).
 */
export function extractCodeBlockRanges(content: string): Range[] {
  const ranges: Range[] = [];
  const len = content.length;
  let i = 0;

  while (i < len) {
    // Fenced code block: ``` or ~~~
    if (
      (content[i] === '`' && content[i + 1] === '`' && content[i + 2] === '`') ||
      (content[i] === '~' && content[i + 1] === '~' && content[i + 2] === '~')
    ) {
      const fenceChar = content[i];
      const fenceStart = i;
      let fenceLen = 0;
      while (i + fenceLen < len && content[i + fenceLen] === fenceChar) {
        fenceLen++;
      }

      let lineEnd = content.indexOf('\n', i);
      if (lineEnd === -1) lineEnd = len;
      i = lineEnd + 1;

      while (i < len) {
        const scanLineStart = i;
        let scanLineEnd = content.indexOf('\n', i);
        if (scanLineEnd === -1) scanLineEnd = len;

        const line = content.substring(scanLineStart, scanLineEnd);
        let j = 0;
        while (j < line.length && line[j] === fenceChar) j++;

        if (j >= fenceLen && j >= 3 && line.substring(j).trim() === '') {
          ranges.push({ from: fenceStart, to: scanLineEnd });
          i = scanLineEnd + 1;
          break;
        }
        i = scanLineEnd + 1;
      }
      continue;
    }

    // Inline code: ` ... `
    if (content[i] === '`' && (i === 0 || content[i - 1] !== '`')) {
      let backtickLen = 0;
      let j = i;
      while (j < len && content[j] === '`') {
        backtickLen++;
        j++;
      }

      let closeIdx = -1;
      let k = j;
      while (k < len) {
        if (content[k] === '`') {
          let closeLen = 0;
          let m = k;
          while (m < len && content[m] === '`') {
            closeLen++;
            m++;
          }
          if (closeLen === backtickLen) {
            closeIdx = k;
            break;
          }
          k = m;
        } else {
          k++;
        }
      }

      if (closeIdx !== -1) {
        ranges.push({ from: i, to: closeIdx + backtickLen });
        i = closeIdx + backtickLen;
      } else {
        i = j;
      }
      continue;
    }

    i++;
  }

  return ranges;
}

/**
 * Binary search: check if `pos` falls inside any range.
 * Ranges must be sorted by `from` ascending.
 */
export function isInsideCodeBlock(pos: number, ranges: Range[]): boolean {
  let lo = 0;
  let hi = ranges.length - 1;

  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    const r = ranges[mid];

    if (pos < r.from) {
      hi = mid - 1;
    } else if (pos >= r.to) {
      lo = mid + 1;
    } else {
      return true;
    }
  }

  return false;
}
