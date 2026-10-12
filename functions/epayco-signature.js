import { createHash, timingSafeEqual } from "node:crypto";

export function verifyEpaycoSignature({
  customerId,
  pKey,
  refPayco,
  transactionId,
  amount,
  currency,
  receivedSignature
}) {
  const fields = [
    customerId, pKey, refPayco, transactionId, amount, currency, receivedSignature
  ];

  if (fields.some((value) => typeof value !== "string" || !value.trim())) {
    return false;
  }

  const expectedSignature = createHash("sha256")
    .update(`${customerId}^${pKey}^${refPayco}^${transactionId}^${amount}^${currency}`)
    .digest("hex");

  const expected = Buffer.from(expectedSignature, "utf8");
  const received = Buffer.from(receivedSignature.trim().toLowerCase(), "utf8");

  return expected.length === received.length && timingSafeEqual(expected, received);
}
