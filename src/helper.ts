export const SHORT_CHARACTERS = new Set([
  "i",
  "t",
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

export function countShortCharactersHelper(input: string): number {
  let count = 0;
  for (const char of input) {
    if (SHORT_CHARACTERS.has(char)) {
      count++;
    }
  }
  return count;
}
