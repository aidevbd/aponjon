/**
 * Dev-only diagnostics for non-fatal failures.
 *
 * অনেক জায়গায় আমরা ইচ্ছা করেই error গিলে ফেলি (presence heartbeat,
 * localStorage quota, browser API not supported ইত্যাদি) — কারণ ইউজারকে
 * দেখানোর কিছু নেই। কিন্তু সম্পূর্ণ নীরব থাকলে ডিবাগ করা অসম্ভব।
 * তাই সেসব ক্ষেত্রে `swallow()` ব্যবহার করুন — production-এ চুপ,
 * development-এ console warning।
 */
export function swallow(scope: string, error: unknown) {
  if (!import.meta.env.DEV) return;
  const detail = error instanceof Error ? `${error.name}: ${error.message}` : error;
  // eslint-disable-next-line no-console
  console.warn(`[swallowed] ${scope}`, detail);
}
