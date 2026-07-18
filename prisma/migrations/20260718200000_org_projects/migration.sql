-- Move "personal" project transactions to no-project (each member's private space)
-- and drop the old per-user "personal" default project.
UPDATE "transactions" SET "project_code" = NULL WHERE "project_code" = 'personal';
DELETE FROM "projects" WHERE "code" = 'personal';

-- Projects become org-level: globally-unique code, referenced by transactions by code only.
ALTER TABLE "transactions" DROP CONSTRAINT IF EXISTS "transactions_project_code_user_id_fkey";
DROP INDEX IF EXISTS "projects_user_id_code_key";
CREATE UNIQUE INDEX "projects_code_key" ON "projects"("code");
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_project_code_fkey" FOREIGN KEY ("project_code") REFERENCES "projects"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- Project membership: admins assign members to projects.
CREATE TABLE "project_members" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "project_members_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "project_members_project_id_user_id_key" ON "project_members"("project_id", "user_id");
CREATE INDEX "project_members_user_id_idx" ON "project_members"("user_id");
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
