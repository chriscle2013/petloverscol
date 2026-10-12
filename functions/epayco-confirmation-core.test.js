import assert from "node:assert/strict";
import { applyEpaycoConfirmation } from "./epayco-confirmation-core.js";

const stamp = () => "SERVER_TIMESTAMP";
const cleanText = (value, max) => String(value ?? "").trim().slice(0, max);

function makeDb(initialOrder) {
  const orders = new Map(initialOrder ? [["order-1", { ...initialOrder }]] : []);
  const transactions = new Map();
  const ref = (collection, id) => ({ collection, id });
  const read = (r) => (r.collection === "orders" ? orders : transactions).get(r.id);
  const db = {
    orders,
    transactions,
    collection: (name) => ({ doc: (id) => ref(name, id) }),
    runTransaction: async (callback) => {
      const writes = [];
      const tx = {
        get: async (r) => {
          const value = read(r);
          return { exists: value !== undefined, data: () => value && { ...value } };
        },
        create: (r, value) => writes.push({ type: "create", ref: r, value }),
        update: (r, value) => writes.push({ type: "update", ref: r, value })
      };
      await callback(tx);
      for (const write of writes) {
        const target = write.ref.collection === "orders" ? orders : transactions;
        if (write.type === "create") {
          if (target.has(write.ref.id)) throw new Error("already exists");
          target.set(write.ref.id, { ...write.value });
        } else {
          target.set(write.ref.id, { ...target.get(write.ref.id), ...write.value });
        }
      }
    }
  };
  return db;
}

const baseOrder = {
  total: 50000,
  status: "pending_payment",
  paymentStatus: "pending",
  paymentMethod: "epayco",
  stockReleased: false
};

async function notify(db, overrides = {}) {
  const {
    transactionId = "txn-1",
    refPayco = "ref-1",
    amountText = "50000",
    currency = "COP",
    ...eventData
  } = overrides;
  return applyEpaycoConfirmation({
    db,
    FieldValue: { serverTimestamp: stamp },
    invoice: "order-1",
    transactionId,
    refPayco,
    amountText,
    currency,
    data: { x_response: "Aceptada", x_test_request: "false", ...eventData },
    cleanText
  });
}

{
  const db = makeDb(baseOrder);
  await notify(db);
  assert.equal(db.orders.get("order-1").status, "paid");
  assert.equal(db.orders.get("order-1").paymentStatus, "paid");
  assert.equal(db.transactions.size, 1);
}

{
  const db = makeDb(baseOrder);
  await notify(db);
  const result = await notify(db);
  assert.equal(result.duplicateTransaction, true);
  assert.equal(db.transactions.size, 1);
}

{
  const db = makeDb(baseOrder);
  await notify(db);
  await assert.rejects(
    notify(db, { refPayco: "otra-referencia" }),
    /different transaction/
  );
}

{
  const db = makeDb(baseOrder);
  await assert.rejects(
    applyEpaycoConfirmation({
      db, FieldValue: { serverTimestamp: stamp }, invoice: "order-1",
      transactionId: "txn-2", refPayco: "ref-2", amountText: "49999",
      currency: "COP", data: { x_response: "Aceptada" }, cleanText
    }),
    /Amount or currency mismatch/
  );
}

{
  const db = makeDb({ ...baseOrder, status: "cancelled", stockReleased: true });
  await notify(db);
  assert.equal(db.orders.get("order-1").status, "cancelled");
  assert.equal(db.orders.get("order-1").paymentStatus, "accepted_review");
}

{
  const db = makeDb({
    ...baseOrder, status: "paid", paymentStatus: "paid",
    epaycoReference: "ref-original", epaycoTransactionId: "txn-original"
  });
  await notify(db, { transactionId: "txn-nuevo", refPayco: "ref-nuevo" });
  assert.equal(db.orders.get("order-1").epaycoReference, "ref-original");
  assert.equal(db.orders.get("order-1").epaycoTransactionId, "txn-original");
  assert.equal(db.orders.get("order-1").paymentStatus, "paid");
}

{
  const db = makeDb(null);
  await assert.rejects(notify(db), /Order not found/);
}

console.log("ePayco confirmation integration tests passed: 7 scenarios.");
