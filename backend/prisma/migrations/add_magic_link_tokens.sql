-- CreateTable: magic_link_tokens
-- สำหรับเก็บ Magic Link Authentication Tokens

CREATE TABLE IF NOT EXISTS "magic_link_tokens" (
    "id" SERIAL NOT NULL,
    "token_id" VARCHAR(255) NOT NULL,
    "user_id" INTEGER NOT NULL,
    "target_url" VARCHAR(500) NOT NULL,
    "action" VARCHAR(50) NOT NULL,
    "metadata" TEXT,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "used_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "magic_link_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "magic_link_tokens_token_id_key" ON "magic_link_tokens"("token_id");

-- CreateIndex
CREATE INDEX "magic_link_tokens_user_id_idx" ON "magic_link_tokens"("user_id");

-- CreateIndex
CREATE INDEX "magic_link_tokens_token_id_idx" ON "magic_link_tokens"("token_id");

-- CreateIndex
CREATE INDEX "magic_link_tokens_expires_at_idx" ON "magic_link_tokens"("expires_at");

-- CreateIndex
CREATE INDEX "magic_link_tokens_used_idx" ON "magic_link_tokens"("used");

-- AddForeignKey
ALTER TABLE "magic_link_tokens" ADD CONSTRAINT "magic_link_tokens_user_id_fkey" 
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Comment
COMMENT ON TABLE "magic_link_tokens" IS 'Magic Link Authentication Tokens - One-time use tokens for email-based auto-login';
