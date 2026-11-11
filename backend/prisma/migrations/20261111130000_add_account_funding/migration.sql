CREATE TABLE "account_fundings" (
    "id" TEXT NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "actor_id" TEXT,
    "amount_paise" BIGINT NOT NULL,
    "balance_after_paise" BIGINT NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "account_fundings_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "account_fundings_amount_paise_check" CHECK ("amount_paise" > 0)
);

CREATE UNIQUE INDEX "account_fundings_idempotency_key_key" ON "account_fundings"("idempotency_key");
CREATE INDEX "account_fundings_account_id_idx" ON "account_fundings"("account_id");
CREATE INDEX "account_fundings_actor_id_idx" ON "account_fundings"("actor_id");

ALTER TABLE "account_fundings"
ADD CONSTRAINT "account_fundings_account_id_fkey"
FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "account_fundings"
ADD CONSTRAINT "account_fundings_actor_id_fkey"
FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
