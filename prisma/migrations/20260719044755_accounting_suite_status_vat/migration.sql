-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "due_date" TIMESTAMP(3),
ADD COLUMN     "paid_at" TIMESTAMP(3),
ADD COLUMN     "status" TEXT;

-- CreateIndex
CREATE INDEX "transactions_status_idx" ON "transactions"("status");

-- CreateIndex
CREATE INDEX "transactions_due_date_idx" ON "transactions"("due_date");
