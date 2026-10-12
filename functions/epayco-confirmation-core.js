import { evaluateEpaycoPayment } from "./epayco-payment-status.js";

export async function applyEpaycoConfirmation({
  db,
  FieldValue,
  invoice,
  transactionId,
  refPayco,
  amountText,
  currency,
  data,
  cleanText
}) {
  const orderRef = db.collection("orders").doc(invoice);
  const transactionRef = db.collection("epaycoTransactions").doc(transactionId);
  let duplicateTransaction = false;

  await db.runTransaction(async (tx) => {
    const [orderSnap, transactionSnap] = await Promise.all([
      tx.get(orderRef),
      tx.get(transactionRef)
    ]);

    if (transactionSnap.exists) {
      const existing = transactionSnap.data() || {};
      if (
        existing.orderId !== invoice ||
        existing.refPayco !== refPayco ||
        Number(existing.amount) !== Number(amountText) ||
        existing.currency !== currency
      ) {
        throw new Error("Transaction ID already belongs to a different transaction");
      }
      duplicateTransaction = true;
      return;
    }

    if (!orderSnap.exists) throw new Error("Order not found");

    const order = orderSnap.data() || {};
    const expectedAmount = Number(order.total);
    const receivedAmount = Number(amountText);

    if (
      !Number.isFinite(expectedAmount) ||
      !Number.isFinite(receivedAmount) ||
      Math.abs(expectedAmount - receivedAmount) > 0.01 ||
      currency !== "COP"
    ) {
      throw new Error("Amount or currency mismatch");
    }

    if (order.paymentMethod && order.paymentMethod !== "epayco") {
      throw new Error("Order uses a different payment method");
    }

    const accepted = String(data.x_response || "").trim().toLowerCase() === "aceptada";
    const isTest = String(data.x_test_request || "").trim().toLowerCase() === "true";
    const { canMarkPaid, paymentStatus } = evaluateEpaycoPayment(order, { accepted, isTest });

    tx.create(transactionRef, {
      orderId: invoice,
      refPayco,
      transactionId,
      amount: receivedAmount,
      currency,
      response: cleanText(data.x_response, 100),
      isTest,
      receivedAt: FieldValue.serverTimestamp()
    });

    const alreadyPaid = order.status === "paid" || order.paymentStatus === "paid";
    tx.update(orderRef, {
      paymentStatus,
      ...(canMarkPaid ? { status: "paid", paidAt: FieldValue.serverTimestamp() } : {}),
      ...(!alreadyPaid ? {
        epaycoReference: refPayco,
        epaycoTransactionId: transactionId
      } : {}),
      updatedAt: FieldValue.serverTimestamp()
    });
  });

  return { duplicateTransaction };
}
