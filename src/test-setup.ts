// Polyfill Temporal for Node < 26
// Vitest runs tests on whatever Node version is active; if Temporal is not
// available natively we inject a minimal stub so helpers.ts doesn't throw.
if (typeof globalThis.Temporal === 'undefined') {
  const fixedTime = {
    toPlainTime: () => ({
      toString: (_opts?: unknown) => '12:00:00',
    }),
  };

  (globalThis as Record<string, unknown>).Temporal = {
    Now: {
      zonedDateTimeISO: (_tz?: string) => fixedTime,
    },
  };
}
