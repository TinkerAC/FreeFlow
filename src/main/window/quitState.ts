let quitting = false;

export function markQuitting(): void {
  quitting = true;
}

export function isAppQuitting(): boolean {
  return quitting;
}
