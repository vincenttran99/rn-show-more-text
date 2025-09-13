export const SHORT_CHARACTERS = new Set([
  "í",
  "ỉ",
  "ị",
  "ỉ",
  "ì",
  "i",
  "t",
  "f",
  "r",
  "l",
  ".",
  ",",
  "|",
  ":",
  ";",
  "'",
  '"',
  "!",
]);

export const LONG_CHARACTERS = new Set(["m", "w", "M", "W"]);

// Compiled regex patterns for better performance
const EMOJI_REGEX =
  /((?:\p{Extended_Pictographic}(?:\uFE0F)?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F)?)*)|(?:\p{Regional_Indicator}{2}))/gu;
const SIMPLE_EMOJI_REGEX =
  /(\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*)/gu;
const COLOR_ATTRIBUTE_REGEX =
  /(fill|stroke|stop-color|color|flood-color|lighting-color)="#[a-fA-F0-9]{3,6}"/g;

// Cache for normalized strings to avoid repeated normalization
const normalizeCache = new Map<string, string>();

// Helper function to get normalized string with caching
function getNormalizedString(text: string): string {
  if (normalizeCache.has(text)) {
    return normalizeCache.get(text)!;
  }
  const normalized = text.normalize("NFC");
  // Limit cache size to prevent memory leaks
  if (normalizeCache.size > 1000) {
    normalizeCache.clear();
  }
  normalizeCache.set(text, normalized);
  return normalized;
}

/**
 * Counts the number of "short" characters in a given string.
 * @param input - The string to analyze.
 * @param customShortCharacters - Custom array of characters with short width (0.5x)
 * @returns The count of short characters.
 */
export function countShortCharactersHelper(
  input: string,
  customShortCharacters: string[] = []
): number {
  let count = 0;

  // Merge custom and default short characters into a single Set for optimal performance
  const allShortCharacters =
    customShortCharacters.length > 0
      ? new Set([...customShortCharacters, ...SHORT_CHARACTERS])
      : SHORT_CHARACTERS;

  for (const char of input) {
    if (allShortCharacters.has(char)) {
      count++;
    }
  }
  return count;
}

/**
 * Calculate the actual visual length of a string
 * Handles complex emojis and regular characters using regex segmentation
 * @param text - The string to measure
 * @returns The visual length of the string
 */
/**
 * Returns visual length, short character count, emoji count, and long character count of a string
 * @param text - The string to analyze
 * @param customShortCharacters - Custom array of characters with short width (0.5x)
 * @param customLongCharacters - Custom array of characters with long width (1.5x)
 * @returns { visualLength, shortCharCount, emojiCount, longCharCount }
 */
export function getVisualLengthHelper(
  text: string,
  customShortCharacters: string[] = [],
  customLongCharacters: string[] = []
): {
  visualLength: number;
  shortCharCount: number;
  emojiCount: number;
  longCharCount: number;
} {
  // Early return for empty strings
  if (!text)
    return {
      visualLength: 0,
      shortCharCount: 0,
      emojiCount: 0,
      longCharCount: 0,
    };

  const normalized = getNormalizedString(text);
  EMOJI_REGEX.lastIndex = 0;

  let visualLength = 0;
  let emojiCount = 0;
  let lastIndex = 0;
  let match;

  // Count emojis and calculate visual length without creating segments array
  while ((match = EMOJI_REGEX.exec(normalized)) !== null) {
    // Add regular characters count before emoji
    if (match.index > lastIndex) {
      visualLength += match.index - lastIndex;
    }
    // Add emoji as single visual unit
    visualLength++;
    emojiCount++;
    lastIndex = EMOJI_REGEX.lastIndex;
  }

  // Add remaining regular characters
  if (lastIndex < normalized.length) {
    visualLength += normalized.length - lastIndex;
  }

  // Reset regex lastIndex
  EMOJI_REGEX.lastIndex = 0;

  // Count short characters efficiently
  const shortCharCount = countShortCharactersHelper(
    text,
    customShortCharacters
  );

  // Count long characters efficiently
  let longCharCount = 0;
  const customLongSet =
    customLongCharacters.length > 0 ? new Set(customLongCharacters) : null;

  for (const char of text) {
    if (customLongSet?.has(char) || LONG_CHARACTERS.has(char)) {
      longCharCount++;
    }
  }

  return {
    visualLength,
    shortCharCount,
    emojiCount,
    longCharCount,
  };
}

/**
 * Slice a string based on visual position (handles emojis correctly)
 * @param text - The string to slice
 * @param start - Start visual position (inclusive), can be negative
 * @param end - End visual position (exclusive), can be negative or undefined
 * @returns The sliced string based on visual positions
 */
export function visualSliceHelper(
  text: string,
  start: number = 0,
  end?: number
): string {
  // Early return for empty strings
  if (!text) return "";

  // Reset regex lastIndex to ensure clean state
  SIMPLE_EMOJI_REGEX.lastIndex = 0;

  const segments: string[] = [];
  let lastIndex = 0;
  let match;

  // Find all emojis and split text into segments using compiled regex
  while ((match = SIMPLE_EMOJI_REGEX.exec(text)) !== null) {
    // Add regular characters before emoji
    if (match.index > lastIndex) {
      const regularText = text.slice(lastIndex, match.index);
      // Split regular text into individual characters
      for (const char of regularText) {
        segments.push(char);
      }
    }

    // Add emoji as single segment
    segments.push(match[0]);
    lastIndex = SIMPLE_EMOJI_REGEX.lastIndex;
  }

  // Add remaining regular characters
  if (lastIndex < text.length) {
    const remainingText = text.slice(lastIndex);
    for (const char of remainingText) {
      segments.push(char);
    }
  }

  // Reset regex lastIndex after use
  SIMPLE_EMOJI_REGEX.lastIndex = 0;

  // Handle negative values like JavaScript's native slice
  const totalLength = segments.length;

  // Early return if start is beyond length
  if (start >= totalLength) return "";

  // Convert negative start to positive
  let normalizedStart = start < 0 ? Math.max(0, totalLength + start) : start;

  // Convert negative end to positive, or use totalLength if undefined
  let normalizedEnd: number;
  if (end === undefined) {
    normalizedEnd = totalLength;
  } else if (end < 0) {
    normalizedEnd = Math.max(0, totalLength + end);
  } else {
    normalizedEnd = end;
  }

  // Ensure start and end are within bounds
  normalizedStart = Math.max(0, Math.min(normalizedStart, totalLength));
  normalizedEnd = Math.max(0, Math.min(normalizedEnd, totalLength));

  // If start >= end, return empty string
  if (normalizedStart >= normalizedEnd) {
    return "";
  }

  // Slice based on normalized positions
  return segments.slice(normalizedStart, normalizedEnd).join("");
}

/**
 * Calculate the slice position from the end of string to remove width >= targetWidth
 * @param text - The string to analyze
 * @param charWidth - Width of a normal character
 * @param targetWidth - Width that needs to be removed
 * @param isMonospaced - Whether the font is monospaced (all characters have equal width)
 * @param customShortCharacters - Custom array of characters with short width (0.5x)
 * @param customLongCharacters - Custom array of characters with long width (1.5x)
 * @returns The slice position from the end (negative value for slice)
 */
export function calculateSlicePositionHelper(
  text: string,
  charWidth: number,
  targetWidth: number,
  isMonospaced: boolean = false,
  customShortCharacters: string[] = [],
  customLongCharacters: string[] = []
): number {
  // Early return for empty strings or zero target width
  if (!text || targetWidth <= 0) return 0;

  const normalized = getNormalizedString(text);

  // For monospaced fonts, we still need to handle emojis specially
  if (isMonospaced) {
    // Reset regex lastIndex to ensure clean state
    EMOJI_REGEX.lastIndex = 0;

    // Calculate from the end without creating segments array
    let accumulatedWidth = 0;
    let slicePosition = 0;
    let totalLength = 0;

    // First pass: calculate total visual length
    let lastIndex = 0;
    let match;
    while ((match = EMOJI_REGEX.exec(normalized)) !== null) {
      // Add regular characters count before emoji
      if (match.index > lastIndex) {
        totalLength += match.index - lastIndex;
      }
      // Add emoji as single visual unit
      totalLength++;
      lastIndex = EMOJI_REGEX.lastIndex;
    }
    // Add remaining regular characters
    if (lastIndex < normalized.length) {
      totalLength += normalized.length - lastIndex;
    }

    // Reset regex for second pass
    EMOJI_REGEX.lastIndex = 0;

    // Second pass: calculate slice position from end
    const emojiPositions = new Map<number, boolean>();
    lastIndex = 0;
    let visualPos = 0;

    // Mark emoji positions
    while ((match = EMOJI_REGEX.exec(normalized)) !== null) {
      // Add regular characters positions
      while (lastIndex < match.index) {
        visualPos++;
        lastIndex++;
      }
      // Mark emoji position
      emojiPositions.set(visualPos, true);
      visualPos++;
      lastIndex = EMOJI_REGEX.lastIndex;
    }

    // Calculate from the end
    for (let i = totalLength - 1; i >= 0; i--) {
      const isEmoji = emojiPositions.has(i);
      accumulatedWidth += isEmoji ? charWidth * 2 : charWidth;
      slicePosition++;

      if (accumulatedWidth >= targetWidth) {
        // Check for trailing space optimization
        if (i > 0 && !emojiPositions.has(i - 1)) {
          // Get the actual character at this position
          let charIndex = 0;
          let visualIndex = 0;
          EMOJI_REGEX.lastIndex = 0;
          lastIndex = 0;

          while ((match = EMOJI_REGEX.exec(normalized)) !== null) {
            if (match.index > lastIndex) {
              const regularChars = match.index - lastIndex;
              if (visualIndex + regularChars > i - 1) {
                charIndex = lastIndex + (i - 1 - visualIndex);
                break;
              }
              visualIndex += regularChars;
              charIndex = match.index;
            }
            if (visualIndex === i - 1) {
              charIndex = match.index;
              break;
            }
            visualIndex++;
            lastIndex = EMOJI_REGEX.lastIndex;
            charIndex = lastIndex;
          }

          if (charIndex < normalized.length && normalized[charIndex] === " ") {
            slicePosition++;
          }
        }

        EMOJI_REGEX.lastIndex = 0;
        return -slicePosition;
      }
    }

    EMOJI_REGEX.lastIndex = 0;
    return -totalLength;
  }

  // For proportional fonts, use optimized logic without creating segments array
  EMOJI_REGEX.lastIndex = 0;

  // Merge custom and default character sets for optimal performance
  const allShortCharacters =
    customShortCharacters.length > 0
      ? new Set([...customShortCharacters, ...SHORT_CHARACTERS])
      : SHORT_CHARACTERS;
  const allLongCharacters =
    customLongCharacters.length > 0
      ? new Set([...customLongCharacters, ...LONG_CHARACTERS])
      : LONG_CHARACTERS;

  // Helper function to get character width
  const getCharWidth = (char: string): number => {
    // Space characters have 0.5x width
    if (char === " ") return charWidth * 0.5;

    // Check merged character sets (single lookup each)
    if (allShortCharacters.has(char)) return charWidth * 0.5;
    if (allLongCharacters.has(char)) return charWidth * 1.5;

    // Regular characters have 1x width
    return charWidth;
  };

  // Calculate total visual length and build position map
  let totalVisualLength = 0;
  const emojiPositions = new Map<number, boolean>();
  let lastIndex = 0;
  let match;
  let visualPos = 0;

  // Process emojis and mark their positions
  while ((match = EMOJI_REGEX.exec(normalized)) !== null) {
    // Add regular characters before emoji
    while (lastIndex < match.index) {
      totalVisualLength++;
      visualPos++;
      lastIndex++;
    }

    // Mark emoji position
    emojiPositions.set(visualPos, true);
    totalVisualLength++;
    visualPos++;
    lastIndex = EMOJI_REGEX.lastIndex;
  }

  // Add remaining regular characters
  while (lastIndex < normalized.length) {
    totalVisualLength++;
    lastIndex++;
  }

  // Reset regex
  EMOJI_REGEX.lastIndex = 0;

  // Calculate from the end
  let accumulatedWidth = 0;
  let slicePosition = 0;

  for (let i = totalVisualLength - 1; i >= 0; i--) {
    let width: number;

    if (emojiPositions.has(i)) {
      // This is an emoji position
      width = charWidth * 2;
    } else {
      // Get the actual character at this visual position
      let charIndex = 0;
      let currentVisualPos = 0;
      lastIndex = 0;

      while ((match = EMOJI_REGEX.exec(normalized)) !== null) {
        // Process regular characters before emoji
        while (lastIndex < match.index && currentVisualPos <= i) {
          if (currentVisualPos === i) {
            charIndex = lastIndex;
            break;
          }
          currentVisualPos++;
          lastIndex++;
        }

        if (currentVisualPos === i) {
          charIndex = lastIndex;
          break;
        }

        // Skip emoji
        if (currentVisualPos === i) {
          // This shouldn't happen as we already checked emojiPositions
          break;
        }
        currentVisualPos++;
        lastIndex = EMOJI_REGEX.lastIndex;
      }

      // Handle remaining characters
      while (lastIndex < normalized.length && currentVisualPos <= i) {
        if (currentVisualPos === i) {
          charIndex = lastIndex;
          break;
        }
        currentVisualPos++;
        lastIndex++;
      }

      width = getCharWidth(normalized[charIndex] || "");
    }

    accumulatedWidth += width;
    slicePosition++;

    if (accumulatedWidth >= targetWidth) {
      // Check for trailing space optimization
      if (i > 0 && !emojiPositions.has(i - 1)) {
        // Get character at position i-1
        let charIndex = 0;
        let currentVisualPos = 0;
        lastIndex = 0;
        EMOJI_REGEX.lastIndex = 0;

        while ((match = EMOJI_REGEX.exec(normalized)) !== null) {
          while (lastIndex < match.index && currentVisualPos <= i - 1) {
            if (currentVisualPos === i - 1) {
              charIndex = lastIndex;
              break;
            }
            currentVisualPos++;
            lastIndex++;
          }
          if (currentVisualPos === i - 1) break;
          currentVisualPos++;
          lastIndex = EMOJI_REGEX.lastIndex;
        }

        while (lastIndex < normalized.length && currentVisualPos <= i - 1) {
          if (currentVisualPos === i - 1) {
            charIndex = lastIndex;
            break;
          }
          currentVisualPos++;
          lastIndex++;
        }

        if (normalized[charIndex] === " ") {
          slicePosition++;
        }
      }

      EMOJI_REGEX.lastIndex = 0;
      return -slicePosition;
    }
  }

  EMOJI_REGEX.lastIndex = 0;
  return -totalVisualLength;
}

/**
 * Calculate the total visual width of a string
 * @param text - The string to analyze
 * @param charWidth - Width of a normal character
 * @param isMonospaced - Whether the font is monospaced (all characters have equal width)
 * @param customShortCharacters - Custom array of characters with short width (0.5x)
 * @param customLongCharacters - Custom array of characters with long width (1.5x)
 * @returns The total visual width of the string
 */
export function calculateStringWidthHelper(
  text: string,
  charWidth: number,
  isMonospaced: boolean = false,
  customShortCharacters: string[] = [],
  customLongCharacters: string[] = []
): number {
  // Early return for empty strings
  if (!text) return 0;

  const normalized = getNormalizedString(text);

  // For monospaced fonts, we still need to handle emojis specially
  if (isMonospaced) {
    // Reset regex lastIndex to ensure clean state
    EMOJI_REGEX.lastIndex = 0;

    let totalWidth = 0;
    let lastIndex = 0;
    let match;

    // Process emojis first using compiled regex
    while ((match = EMOJI_REGEX.exec(normalized)) !== null) {
      // Add width of regular characters before emoji (all have same width in monospaced)
      if (match.index > lastIndex) {
        totalWidth += (match.index - lastIndex) * charWidth;
      }

      // Add emoji width (2 * charWidth even in monospaced)
      totalWidth += charWidth * 2;
      lastIndex = EMOJI_REGEX.lastIndex;
    }

    // Add width of remaining regular characters
    if (lastIndex < normalized.length) {
      totalWidth += (normalized.length - lastIndex) * charWidth;
    }

    // Reset regex lastIndex after use
    EMOJI_REGEX.lastIndex = 0;
    return totalWidth;
  }

  // For proportional fonts, use optimized logic
  EMOJI_REGEX.lastIndex = 0;

  // Merge custom and default character sets for optimal performance
  const allShortCharacters =
    customShortCharacters.length > 0
      ? new Set([...customShortCharacters, ...SHORT_CHARACTERS])
      : SHORT_CHARACTERS;
  const allLongCharacters =
    customLongCharacters.length > 0
      ? new Set([...customLongCharacters, ...LONG_CHARACTERS])
      : LONG_CHARACTERS;

  // Helper function to get character width (reuse from calculateSlicePositionHelper)
  const getCharWidth = (char: string): number => {
    // Space characters have 0.5x width
    if (char === " ") return charWidth * 0.5;

    // Check merged character sets (single lookup each)
    if (allShortCharacters.has(char)) return charWidth * 0.5;
    if (allLongCharacters.has(char)) return charWidth * 1.5;

    // Regular characters have 1x width
    return charWidth;
  };

  let totalWidth = 0;
  let lastIndex = 0;
  let match;

  // Process emojis first using compiled regex
  while ((match = EMOJI_REGEX.exec(normalized)) !== null) {
    // Add width of regular characters before emoji
    if (match.index > lastIndex) {
      for (let i = lastIndex; i < match.index; i++) {
        totalWidth += getCharWidth(normalized[i]);
      }
    }

    // Add emoji width (2 * charWidth)
    totalWidth += charWidth * 2;
    lastIndex = EMOJI_REGEX.lastIndex;
  }

  // Add width of remaining regular characters
  if (lastIndex < normalized.length) {
    for (let i = lastIndex; i < normalized.length; i++) {
      totalWidth += getCharWidth(normalized[i]);
    }
  }

  // Reset regex lastIndex after use
  EMOJI_REGEX.lastIndex = 0;
  return totalWidth;
}

export function balanceDiffHelper(
  numOfEmojis: number = 0,
  numOfShortCharacters: number = 0,
  numOfLongCharacters: number = 0
) {
  return numOfEmojis + 0.5 * numOfLongCharacters - 0.5 * numOfShortCharacters;
}
