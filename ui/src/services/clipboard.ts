/**
 * Copies text to the clipboard.
 * Tries the modern Navigator Clipboard API first (available in secure contexts).
 * Falls back to document.execCommand('copy') via a temporary off-screen textarea
 * when navigator.clipboard is unavailable (e.g. non-secure HTTP contexts, LAN IPs) or fails.
 *
 * @param text The text to copy
 * @returns Promise<boolean> true if copying succeeded, false otherwise
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  const content = text === null || text === undefined ? "" : String(text);

  // 1. Try modern navigator.clipboard API if available
  if (
    typeof navigator !== "undefined" &&
    navigator.clipboard &&
    typeof navigator.clipboard.writeText === "function"
  ) {
    try {
      await navigator.clipboard.writeText(content);
      return true;
    } catch {
      // Failed (e.g. NotAllowedError, not focused, or permissions issue); fallback below
    }
  }

  // 2. Fallback to document.execCommand('copy')
  if (typeof document !== "undefined") {
    try {
      const textArea = document.createElement("textarea");
      textArea.value = content;

      // Ensure the textarea is off-screen and invisible to avoid UI flickering/scrolling
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      textArea.style.top = "-999999px";
      textArea.setAttribute("readonly", "");
      textArea.style.opacity = "0";

      document.body.appendChild(textArea);
      try {
        textArea.focus();
        textArea.select();
        textArea.setSelectionRange(0, textArea.value.length);
        return document.execCommand("copy");
      } finally {
        if (textArea.parentNode) {
          textArea.parentNode.removeChild(textArea);
        }
      }
    } catch {
      return false;
    }
  }

  return false;
}
