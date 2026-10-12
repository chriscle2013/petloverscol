import assert from "node:assert/strict";
import { evaluateEpaycoPayment } from "./epayco-payment-status.js";

assert.deepEqual(
  evaluateEpaycoPayment(
    { status: "pending_payment", paymentStatus: "pending", stockReleased: false },
    { accepted: true, isTest: false }
  ),
  { canMarkPaid: true, paymentStatus: "paid" }
);

assert.deepEqual(
  evaluateEpaycoPayment(
    { status: "pending_payment", paymentStatus: "pending", stockReleased: false },
    { accepted: true, isTest: true }
  ),
  { canMarkPaid: false, paymentStatus: "test_accepted" }
);

assert.deepEqual(
  evaluateEpaycoPayment(
    { status: "paid", paymentStatus: "paid" },
    { accepted: false, isTest: false }
  ),
  { canMarkPaid: false, paymentStatus: "paid" }
);

assert.deepEqual(
  evaluateEpaycoPayment(
    { status: "cancelled", paymentStatus: "not_paid", stockReleased: true },
    { accepted: true, isTest: false }
  ),
  { canMarkPaid: false, paymentStatus: "accepted_review" }
);

assert.deepEqual(
  evaluateEpaycoPayment(
    { status: "pending_payment", paymentStatus: "accepted_review" },
    { accepted: false, isTest: false }
  ),
  { canMarkPaid: false, paymentStatus: "accepted_review" }
);

assert.deepEqual(
  evaluateEpaycoPayment(
    { status: "pending_payment", paymentStatus: "test_accepted" },
    { accepted: false, isTest: false }
  ),
  { canMarkPaid: false, paymentStatus: "test_accepted" }
);

assert.deepEqual(
  evaluateEpaycoPayment(
    { status: "pending_payment", paymentStatus: "pending", stockReleased: true },
    { accepted: true, isTest: false }
  ),
  { canMarkPaid: false, paymentStatus: "accepted_review" }
);


assert.deepEqual(
  evaluateEpaycoPayment(
    { status: "pending_payment", paymentStatus: "session_unknown", stockReleased: false },
    { accepted: false, isTest: false }
  ),
  { canMarkPaid: false, paymentStatus: "session_unknown" }
);

assert.deepEqual(
  evaluateEpaycoPayment(
    { status: "pending_payment", paymentStatus: "session_unknown", stockReleased: false },
    { accepted: true, isTest: false }
  ),
  { canMarkPaid: true, paymentStatus: "paid" }
);

assert.deepEqual(
  evaluateEpaycoPayment(
    { status: "pending_payment", paymentStatus: "session_creating", stockReleased: false },
    { accepted: false, isTest: false }
  ),
  { canMarkPaid: false, paymentStatus: "session_creating" }
);

console.log("ePayco payment status tests passed: 10 scenarios.");
