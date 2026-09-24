export function formatTTL(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} seconds`;
  }
  if (seconds < 3600) {
    const mins = Math.round(seconds / 60);
    return `${mins} min`;
  }
  if (seconds < 86400) {
    const hours = Math.round(seconds / 3600);
    return hours === 1 ? '1 hour' : `${hours} hours`;
  }
  const days = Math.round(seconds / 86400);
  return days === 1 ? '1 day' : `${days} days`;
}

export function formatExpiresAt(expiresAt?: string | number): string {
  if (!expiresAt) {
    return 'in 1 hour';
  }

  try {
    const target = typeof expiresAt === 'number' ? new Date(expiresAt) : new Date(expiresAt);
    const now = new Date();
    const diffMs = target.getTime() - now.getTime();

    if (isNaN(diffMs)) {
      return 'soon';
    }

    if (diffMs <= 0) {
      return 'expired';
    }

    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) {
      return 'in less than a minute';
    }
    if (diffMins < 60) {
      return `in ${diffMins} min`;
    }

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) {
      return `in ${diffHours} hr${diffHours > 1 ? 's' : ''}`;
    }

    const diffDays = Math.floor(diffHours / 24);
    return `in ${diffDays} day${diffDays > 1 ? 's' : ''}`;
  } catch {
    return 'in 1 hour';
  }
}
