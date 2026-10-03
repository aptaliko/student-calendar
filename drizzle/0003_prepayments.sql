CREATE TABLE "payment_allocations" (
	"id" serial PRIMARY KEY NOT NULL,
	"payment_id" integer NOT NULL,
	"lesson_id" integer NOT NULL,
	"amount_cents" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "lessons" DROP CONSTRAINT "lessons_payment_id_payments_id_fk";
--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "lesson_count" integer;--> statement-breakpoint
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "payment_allocations_payment_idx" ON "payment_allocations" USING btree ("payment_id");--> statement-breakpoint
CREATE INDEX "payment_allocations_lesson_idx" ON "payment_allocations" USING btree ("lesson_id");--> statement-breakpoint
-- Backfill: every lesson linked to a payment becomes an allocation of its share. A lesson whose
-- share is missing (old rows) is allocated its full price.
INSERT INTO "payment_allocations" ("payment_id", "lesson_id", "amount_cents")
SELECT "payment_id", "id", COALESCE("paid_cents", "price_cents") FROM "lessons" WHERE "payment_id" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "lessons" DROP COLUMN "payment_id";--> statement-breakpoint
ALTER TABLE "lessons" DROP COLUMN "paid_cents";