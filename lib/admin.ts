import { timingSafeEqual } from "node:crypto";

export function getAdminToken() {
  return process.env.NEAR_ME_ADMIN_TOKEN?.trim() ?? "";
}

export function isValidAdminToken(input: string | null | undefined) {
  const expected = getAdminToken();
  const provided = input?.trim() ?? "";

  if (!expected || !provided) {
    return false;
  }

  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(provided);

  if (expectedBuffer.length !== providedBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, providedBuffer);
}
