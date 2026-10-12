const FINAL_ORDER_STATUSES = new Set(["cancelled", "shipped", "delivered"]);

export function evaluateEpaycoPayment(order, { accepted, isTest }) {
  const currentStatus = String(order.status || "pending_payment");
  const currentPaymentStatus = String(order.paymentStatus || "not_paid");

  if (currentPaymentStatus === "paid" || currentStatus === "paid") {
    return { canMarkPaid: false, paymentStatus: "paid" };
  }

  if (["accepted_review", "test_accepted"].includes(currentPaymentStatus)) {
    return { canMarkPaid: false, paymentStatus: currentPaymentStatus };
  }

  const canMarkPaid =
    accepted === true &&
    isTest !== true &&
    currentStatus === "pending_payment" &&
    order.stockReleased !== true &&
    ["not_paid", "pending"].includes(currentPaymentStatus) &&
    !FINAL_ORDER_STATUSES.has(currentStatus);

  if (canMarkPaid) return { canMarkPaid: true, paymentStatus: "paid" };
  if (accepted && isTest) return { canMarkPaid: false, paymentStatus: "test_accepted" };
  if (accepted) return { canMarkPaid: false, paymentStatus: "accepted_review" };
  return { canMarkPaid: false, paymentStatus: "not_paid" };
}
