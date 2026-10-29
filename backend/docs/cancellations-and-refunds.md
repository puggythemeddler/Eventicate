# Cancellations and refunds

Customers and providers can request cancellation of confirmed or deposit-paid bookings. Paid bookings cannot bypass review through a direct status change. An open request keeps the booking and inventory active until an administrator makes a decision; repeated submissions return the existing request.

Admins review the signed agreement and verified funds received in **Admin → Complaints**:

1. **Investigating** keeps the booking active.
2. **Dismissed** declines cancellation and leaves the booking active.
3. **Resolved / No refund** approves cancellation without a refund, with decision notes.
4. **Refund pending** approves a full or partial refund. For cancellation requests, this cancels the booking and releases its reserved inventory. It does **not** transfer money.
5. Return the funds through the original payment channel. Then select **Resolved** and enter the completed transfer reference. The amount, reference, timestamp and recording admin are stored. The completed refund decision cannot be reopened or changed through this API.

Refunds are capped at settled incoming payments minus other approved or recorded refunds for the same booking. Failed and pending payments do not count. Refund approval, cancellation, stock release and notifications commit together in a serializable transaction. Original payment records and the deposit-received flag are retained as financial history.

The current M-Pesa integration supports incoming STK payments, not automatic refund transfers. Refund transfers are performed and verified outside Eventicate; the admin screen explicitly records that fact. A reference is an admin attestation, not independent gateway confirmation.

The additive migration adds refund transfer reference, timestamp and recording admin fields plus a partial unique index for open cancellation requests. Deployment runs `prisma migrate deploy` before starting the new backend.

Run `npm test` in `backend/` for the isolated cancellation/refund journey and payment regressions. No external money or production records are touched by these tests. The live M-Pesa gateway test remains pending until sandbox credentials and a callback secret are configured.
