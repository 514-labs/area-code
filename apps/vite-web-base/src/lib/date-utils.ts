/**
 * Date utilities for consistent date handling across the application
 */

/**
 * Safely parses a date string/Date object and returns a Date object
 * Returns null if the date is invalid
 */
export function safeParseDate(date: string | Date | null | undefined): Date | null {
  if (!date) return null;
  
  const parsedDate = new Date(date);
  
  // Check if the date is valid
  if (isNaN(parsedDate.getTime())) {
    return null;
  }
  
  return parsedDate;
}

/**
 * Formats a date as a user-friendly date string (e.g., "Dec 25, 2023")
 */
export function formatDate(date: string | Date | null | undefined): string {
  const parsedDate = safeParseDate(date);
  
  if (!parsedDate) {
    return "Invalid Date";
  }
  
  return parsedDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short", 
    day: "numeric"
  });
}

/**
 * Formats a date with time as a user-friendly datetime string (e.g., "Dec 25, 2023, 2:30 PM")
 */
export function formatDateTime(date: string | Date | null | undefined): string {
  const parsedDate = safeParseDate(date);
  
  if (!parsedDate) {
    return "Invalid Date";
  }
  
  return parsedDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  });
}

/**
 * Formats a date for display in data tables with shorter format
 */
export function formatTableDate(date: string | Date | null | undefined): string {
  const parsedDate = safeParseDate(date);
  
  if (!parsedDate) {
    return "N/A";
  }
  
  const now = new Date();
  const diffInMs = now.getTime() - parsedDate.getTime();
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  
  // If the date is today, show time
  if (diffInDays === 0) {
    return parsedDate.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    });
  }
  
  // If the date is within the last week, show "X days ago"
  if (diffInDays > 0 && diffInDays <= 7) {
    return `${diffInDays} day${diffInDays === 1 ? '' : 's'} ago`;
  }
  
  // If the date is this year, don't show the year
  if (parsedDate.getFullYear() === now.getFullYear()) {
    return parsedDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric"
    });
  }
  
  // For older dates, show month/day/year
  return parsedDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

/**
 * Formats a CDC timestamp with both date and time for batch processing info
 */
export function formatCDCTimestamp(date: string | Date | null | undefined): string {
  const parsedDate = safeParseDate(date);
  
  if (!parsedDate) {
    return "N/A";
  }
  
  const now = new Date();
  const diffInMs = now.getTime() - parsedDate.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  
  // If less than 1 minute ago, show "Just now"
  if (diffInMinutes < 1) {
    return "Just now";
  }
  
  // If less than 60 minutes ago, show "X minutes ago"
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes === 1 ? '' : 's'} ago`;
  }
  
  // If less than 24 hours ago, show "X hours ago"
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours === 1 ? '' : 's'} ago`;
  }
  
  // For older dates, show full date and time
  return parsedDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: parsedDate.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  });
}

/**
 * Returns a relative time string (e.g., "2 hours ago", "3 days ago")
 */
export function formatRelativeTime(date: string | Date | null | undefined): string {
  const parsedDate = safeParseDate(date);
  
  if (!parsedDate) {
    return "Unknown";
  }
  
  const now = new Date();
  const diffInMs = now.getTime() - parsedDate.getTime();
  const diffInSeconds = Math.floor(diffInMs / 1000);
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);
  
  if (diffInSeconds < 60) {
    return "Just now";
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes === 1 ? '' : 's'} ago`;
  } else if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours === 1 ? '' : 's'} ago`;
  } else if (diffInDays < 30) {
    return `${diffInDays} day${diffInDays === 1 ? '' : 's'} ago`;
  } else {
    return formatDate(parsedDate);
  }
} 