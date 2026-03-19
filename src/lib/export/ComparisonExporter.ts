import type { FullComparisonResult } from "@/lib/comparison/attribute-comparators";
import type { BacklogItemType } from "@/types/match";

/**
 * Export options for comparison images
 */
export interface ComparisonExportOptions {
  width?: number;
  quality?: number;
  backgroundColor?: string;
  showWinnerHighlight?: boolean;
  showStats?: boolean;
  title?: string;
}

const DEFAULT_OPTIONS: Required<ComparisonExportOptions> = {
  width: 1200,
  quality: 0.92,
  backgroundColor: "#0f172a",
  showWinnerHighlight: true,
  showStats: true,
  title: "Item Comparison",
};

/**
 * Generate comparison image using html2canvas
 */
export async function exportComparisonAsImage(
  element: HTMLElement,
  options: ComparisonExportOptions = {}
): Promise<Blob | null> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  try {
    // Dynamic import html2canvas
    const html2canvas = (await import("html2canvas")).default;

    const canvas = await html2canvas(element, {
      backgroundColor: opts.backgroundColor,
      scale: 2,
      logging: false,
      useCORS: true,
      allowTaint: true,
    });

    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => {
          resolve(blob);
        },
        "image/png",
        opts.quality
      );
    });
  } catch (error) {
    console.error("Failed to export comparison:", error);
    return null;
  }
}

/**
 * Download comparison as PNG
 */
export async function downloadComparisonImage(
  element: HTMLElement,
  filename: string = "comparison",
  options: ComparisonExportOptions = {}
): Promise<boolean> {
  const blob = await exportComparisonAsImage(element, options);

  if (!blob) {
    return false;
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}-${Date.now()}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return true;
}

/**
 * Copy comparison image to clipboard
 */
export async function copyComparisonToClipboard(
  element: HTMLElement,
  options: ComparisonExportOptions = {}
): Promise<boolean> {
  const blob = await exportComparisonAsImage(element, options);

  if (!blob) {
    return false;
  }

  try {
    await navigator.clipboard.write([
      new ClipboardItem({
        "image/png": blob,
      }),
    ]);
    return true;
  } catch (error) {
    console.error("Failed to copy to clipboard:", error);
    return false;
  }
}

/**
 * Generate comparison summary text
 */
export function generateComparisonText(
  items: BacklogItemType[],
  result: FullComparisonResult
): string {
  const lines: string[] = [];

  lines.push("=== ITEM COMPARISON ===\n");

  // Items
  lines.push("Items compared:");
  items.forEach((item, i) => {
    const wins = result.totalWins[item.id] || 0;
    const isWinner = item.id === result.overallWinnerId;
    lines.push(`  ${i + 1}. ${item.title}${isWinner ? " [WINNER]" : ""} (${wins} wins)`);
  });

  lines.push("\nAttribute comparison:");
  result.attributes.forEach((attr) => {
    if (attr.type === "text") {
      lines.push(`  ${attr.label}: ${attr.formattedValues.join(" | ")}`);
    } else {
      const winnerMark = attr.winnerIndex !== null ? ` [#${attr.winnerIndex + 1} wins]` : "";
      lines.push(`  ${attr.label}: ${attr.formattedValues.join(" | ")}${winnerMark}`);
    }
  });

  if (result.overallWinnerId) {
    const winner = items.find((i) => i.id === result.overallWinnerId);
    lines.push(`\nOverall winner: ${winner?.title}`);
    lines.push(
      `Win percentage: ${result.winPercentages[result.overallWinnerId]}%`
    );
  } else {
    lines.push("\nNo clear winner - items are closely matched");
  }

  return lines.join("\n");
}

/**
 * Copy comparison as text to clipboard
 */
export async function copyComparisonAsText(
  items: BacklogItemType[],
  result: FullComparisonResult
): Promise<boolean> {
  const text = generateComparisonText(items, result);

  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error("Failed to copy text:", error);
    return false;
  }
}

/**
 * Share comparison via Web Share API (mobile)
 */
export async function shareComparison(
  element: HTMLElement,
  title: string,
  options: ComparisonExportOptions = {}
): Promise<boolean> {
  // Check if Web Share API is available
  if (!navigator.share || !navigator.canShare) {
    return false;
  }

  const blob = await exportComparisonAsImage(element, options);

  if (!blob) {
    return false;
  }

  const file = new File([blob], `comparison-${Date.now()}.png`, {
    type: "image/png",
  });

  const shareData: ShareData = {
    title,
    text: "Check out this comparison!",
    files: [file],
  };

  if (!navigator.canShare(shareData)) {
    // Fallback to text-only share
    return navigator
      .share({
        title,
        text: "Check out this comparison!",
      })
      .then(() => true)
      .catch(() => false);
  }

  try {
    await navigator.share(shareData);
    return true;
  } catch (error) {
    if ((error as Error).name !== "AbortError") {
      console.error("Share failed:", error);
    }
    return false;
  }
}

/**
 * Check if sharing is supported
 */
export function isShareSupported(): boolean {
  return typeof navigator !== "undefined" && !!navigator.share;
}

/**
 * Check if clipboard image copy is supported
 */
export function isClipboardImageSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    !!navigator.clipboard &&
    typeof ClipboardItem !== "undefined"
  );
}
