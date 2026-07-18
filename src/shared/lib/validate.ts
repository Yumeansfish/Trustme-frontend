export function validateRegex(re: string) {
  // validates if pattern is a valid regex
  // returns true if regex is valid
  if (re === '') return false;
  try {
    new RegExp(re);
  } catch {
    return false;
  }
  return true;
}
