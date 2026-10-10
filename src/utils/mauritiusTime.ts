/**
 * Mauritius Time (MUT - UTC+4) and Currency Utilities
 * Mauritius SME Shopkeeper locale helpers
 */

export function getMauritiusNow(): Date {
  // Use Intl to get date in Indian/Mauritius timezone
  const now = new Date();
  const tzString = now.toLocaleString("en-US", { timeZone: "Indian/Mauritius" });
  return new Date(tzString);
}

export function formatMauritiusClock(date: Date = getMauritiusNow()): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds} MUT`;
}

export function formatMauritiusShortTime(date: Date = getMauritiusNow()): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function formatMauritiusDateString(date: Date = getMauritiusNow()): string {
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  };
  return date.toLocaleDateString('en-GB', options);
}

export function getMauritiusDateKey(date: Date = getMauritiusNow()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getShopkeeperGreeting(ownerName?: string): string {
  const mut = getMauritiusNow();
  const hour = mut.getHours();
  const namePart = ownerName ? `, ${ownerName}` : '';

  if (hour >= 5 && hour < 12) {
    return `Bonzour${namePart} · Morning trade is open`;
  } else if (hour >= 12 && hour < 17) {
    return `Bonzour${namePart} · Afternoon pulse`;
  } else if (hour >= 17 && hour < 22) {
    return `Bonswar${namePart} · Evening settlement`;
  } else {
    return `Bonswar${namePart} · Night register closed`;
  }
}

/**
 * Format Mauritian Rupee (MUR / Rs) with crisp monospace number formatting
 */
export function formatRs(amount: number): string {
  const formatted = new Intl.NumberFormat('en-MU', {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0
  }).format(amount);
  return `Rs ${formatted}`;
}

/**
 * Returns the last 7 days ending today in MUT
 */
export function getLast7DaysMUT(): Array<{ dateKey: string; dayLabel: string; isToday: boolean }> {
  const today = getMauritiusNow();
  const todayKey = getMauritiusDateKey(today);
  const days = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
    const key = getMauritiusDateKey(d);
    const dayLabel = d.toLocaleDateString('en-GB', { weekday: 'short' });
    days.push({
      dateKey: key,
      dayLabel,
      isToday: key === todayKey
    });
  }

  return days;
}
