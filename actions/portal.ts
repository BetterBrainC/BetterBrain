"use server";

import { getRelativePortal, type RelativePortalData } from "@/lib/data/queries";

/**
 * Verify the relatives portal phone last-4 SERVER-SIDE. The expected value never
 * reaches the browser — only a matched last-4 unlocks the (stripped) data.
 */
export async function verifyRelativePortal(
  token: string,
  last4: string,
): Promise<{ data?: RelativePortalData; error?: string }> {
  const full = await getRelativePortal(token);
  if (!full) return { error: "ลิงก์ไม่ถูกต้องหรือหมดอายุ" };
  if (!/^\d{4}$/.test(last4) || last4 !== full.phoneLast4) {
    return { error: "รหัสไม่ถูกต้อง" };
  }
  const { phoneLast4: _omit, ...data } = full;
  void _omit;
  return { data };
}
