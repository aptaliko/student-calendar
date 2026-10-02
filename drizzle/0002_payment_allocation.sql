DROP INDEX "payments_owner_date_idx";--> statement-breakpoint
ALTER TABLE "lessons" ADD COLUMN "paid_cents" integer;--> statement-breakpoint
-- Backfill: split each existing payment's amount across its lessons in proportion to their
-- prices, then put the rounding remainder on the payment's last lesson so the shares add up.
UPDATE "lessons" AS l
SET "paid_cents" = ROUND(l."price_cents"::numeric * p."amount_cents" / NULLIF(s."total", 0))
FROM "payments" AS p,
  (SELECT "payment_id", SUM("price_cents") AS "total" FROM "lessons" WHERE "payment_id" IS NOT NULL GROUP BY "payment_id") AS s
WHERE l."payment_id" = p."id" AND s."payment_id" = p."id";--> statement-breakpoint
UPDATE "lessons" AS l
SET "paid_cents" = COALESCE(l."paid_cents", 0) + d."diff"
FROM (
  SELECT p."id" AS "pid", p."amount_cents" - COALESCE(SUM(x."paid_cents"), 0) AS "diff", MAX(x."id") AS "lid"
  FROM "payments" AS p JOIN "lessons" AS x ON x."payment_id" = p."id"
  GROUP BY p."id", p."amount_cents"
) AS d
WHERE l."id" = d."lid" AND d."diff" <> 0;--> statement-breakpoint
CREATE INDEX "payments_owner_idx" ON "payments" USING btree ("owner_id");--> statement-breakpoint
ALTER TABLE "payments" DROP COLUMN "date";