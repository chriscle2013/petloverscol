import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { verifyEpaycoSignature } from "./epayco-signature.js";

const fields = {
  customerId: "customer-123",
  pKey: "private-key",
  refPayco: "ref-456",
  transactionId: "txn-789",
  amount: "50000",
  currency: "COP"
};
const signature = createHash("sha256")
  .update(`${fields.customerId}^${fields.pKey}^${fields.refPayco}^${fields.transactionId}^${fields.amount}^${fields.currency}`)
  .digest("hex");

assert.equal(verifyEpaycoSignature({ ...fields, receivedSignature: signature }), true);
assert.equal(verifyEpaycoSignature({ ...fields, amount: "1", receivedSignature: signature }), false);
assert.equal(verifyEpaycoSignature({ ...fields, receivedSignature: "bad" }), false);
assert.equal(verifyEpaycoSignature({ ...fields, receivedSignature: "" }), false);
assert.equal(verifyEpaycoSignature({ ...fields, customerId: " ", receivedSignature: signature }), false);

console.log("ePayco signature tests passed: valid, altered amount, malformed and missing signature.");
