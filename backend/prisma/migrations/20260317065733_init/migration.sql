-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('low', 'normal', 'urgent');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('draft', 'scheduled', 'submitted', 'pending_approval', 'approved', 'assigned', 'in_progress', 'rework', 'assignee_rejected', 'rejected', 'rejected_by_assignee', 'cancelled', 'pending_rejection', 'partially_completed', 'completed', 'closed');

-- CreateTable
CREATE TABLE "tenants" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "subdomain" VARCHAR(100),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "default_rejection_cc_emails" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "email_settings" JSONB DEFAULT '{}',
    "portal_settings" JSONB DEFAULT '{}',

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "department_id" INTEGER,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "display_name" VARCHAR(100),
    "phone" VARCHAR(50),
    "title" VARCHAR(100),
    "avatar_url" VARCHAR(500),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" VARCHAR(50) DEFAULT 'APPROVED',
    "registered_at" TIMESTAMP(3),
    "approved_at" TIMESTAMP(3),
    "approved_by" INTEGER,
    "rejection_reason" TEXT,
    "last_login_at" TIMESTAMP(3),
    "must_change_password" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "display_name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "permissions" JSONB DEFAULT '{"read": true, "create": false, "update": false, "delete": false}'::jsonb,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "role_name" VARCHAR(100),
    "assigned_by" INTEGER,
    "assigned_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "buds" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "buds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "bud_id" INTEGER NOT NULL,
    "department_id" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_types" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "sla_days" INTEGER NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "next_job_type_id" INTEGER,
    "icon" VARCHAR,
    "color_theme" VARCHAR,
    "attachments" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "job_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jobs" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "project_id" INTEGER NOT NULL,
    "job_type_id" INTEGER NOT NULL,
    "dj_id" VARCHAR(50) NOT NULL,
    "subject" VARCHAR(255) NOT NULL,
    "objective" TEXT,
    "description" TEXT,
    "headline" VARCHAR(255),
    "sub_headline" VARCHAR(255),
    "brief_link" VARCHAR(1000),
    "brief_files" JSONB DEFAULT '[]',
    "status" VARCHAR(50) NOT NULL DEFAULT 'draft',
    "priority" VARCHAR(20) NOT NULL DEFAULT 'normal',
    "requester_id" INTEGER NOT NULL,
    "assignee_id" INTEGER,
    "close_requested_by" INTEGER,
    "closed_by" INTEGER,
    "completed_by" INTEGER,
    "rejected_by" INTEGER,
    "rejection_source" VARCHAR(50),
    "rejection_comment" TEXT,
    "rejection_denied_at" TIMESTAMPTZ,
    "rejection_denied_by" INTEGER,
    "cancellation_reason" TEXT,
    "is_parent" BOOLEAN NOT NULL DEFAULT false,
    "parent_job_id" INTEGER,
    "due_date" TIMESTAMPTZ,
    "assigned_at" TIMESTAMPTZ,
    "started_at" TIMESTAMPTZ,
    "completed_at" TIMESTAMPTZ,
    "acceptance_date" TIMESTAMPTZ,
    "acceptance_method" VARCHAR(20) DEFAULT 'auto',
    "original_due_date" TIMESTAMPTZ,
    "extension_count" INTEGER NOT NULL DEFAULT 0,
    "last_extended_at" TIMESTAMPTZ,
    "extension_reason" TEXT,
    "draft_files" JSONB DEFAULT '[]',
    "draft_submitted_at" TIMESTAMPTZ,
    "draft_count" INTEGER NOT NULL DEFAULT 0,
    "rebrief_reason" TEXT,
    "rebrief_count" INTEGER NOT NULL DEFAULT 0,
    "rebrief_at" TIMESTAMPTZ,
    "rebrief_response" TEXT,
    "predecessor_id" INTEGER,
    "next_job_id" INTEGER,
    "sla_days" INTEGER DEFAULT 0,
    "close_requested_at" TIMESTAMPTZ,
    "closed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "auto_approved_levels" JSONB DEFAULT '[]',
    "final_files" JSONB DEFAULT '[]',

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_attachments" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "job_id" INTEGER NOT NULL,
    "file_name" VARCHAR(500) NOT NULL,
    "file_path" VARCHAR(1000) NOT NULL,
    "file_size" BIGINT,
    "file_type" VARCHAR(100),
    "attachment_type" VARCHAR(100),
    "uploaded_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_deliverables" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "job_id" INTEGER NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "file_name" VARCHAR(500) NOT NULL,
    "file_path" VARCHAR(1000) NOT NULL,
    "file_size" BIGINT,
    "file_type" VARCHAR(100),
    "uploaded_by" INTEGER NOT NULL,
    "is_final" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_deliverables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_flows" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "project_id" INTEGER,
    "job_type_id" INTEGER,
    "level" INTEGER NOT NULL DEFAULT 0,
    "skip_approval" BOOLEAN NOT NULL DEFAULT false,
    "auto_assign_type" VARCHAR(50),
    "auto_assign_user_id" INTEGER,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "conditions" JSONB,
    "approver_steps" JSONB,
    "allow_override" BOOLEAN NOT NULL DEFAULT false,
    "effective_from" DATE,
    "effective_to" DATE,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "approval_flows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approvals" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "job_id" INTEGER NOT NULL,
    "step_number" INTEGER NOT NULL,
    "approver_id" INTEGER NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'pending',
    "comment" TEXT,
    "approved_at" TIMESTAMP(3),
    "approval_token" VARCHAR(64),
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_activities" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "job_id" INTEGER NOT NULL,
    "user_id" INTEGER,
    "activity_type" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_comments" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "job_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "comment" TEXT NOT NULL,
    "mentions" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "message" TEXT,
    "link" VARCHAR(500),
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "bud_id" INTEGER,
    "name" VARCHAR(255) NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "manager_id" INTEGER,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "design_job_items" (
    "id" SERIAL NOT NULL,
    "job_id" INTEGER NOT NULL,
    "job_type_item_id" INTEGER,
    "name" VARCHAR(255) NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "status" VARCHAR(50) NOT NULL DEFAULT 'pending',
    "file_path" TEXT,

    CONSTRAINT "design_job_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_type_items" (
    "id" SERIAL NOT NULL,
    "job_type_id" INTEGER NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "default_size" VARCHAR(100),
    "is_required" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_type_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" SERIAL NOT NULL,
    "job_id" INTEGER NOT NULL,
    "user_id" INTEGER,
    "action" VARCHAR(50) NOT NULL,
    "message" TEXT,
    "detail" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "user_id" INTEGER,
    "action" VARCHAR(100) NOT NULL,
    "entity_type" VARCHAR(100) NOT NULL,
    "entity_id" INTEGER,
    "old_values" JSONB,
    "new_values" JSONB,
    "user_ip" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_logs" (
    "id" SERIAL NOT NULL,
    "notification_id" INTEGER NOT NULL,
    "status" VARCHAR(50) NOT NULL,
    "sent_at" TIMESTAMPTZ,
    "error" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_job_assignments" (
    "id" SERIAL NOT NULL,
    "project_id" INTEGER NOT NULL,
    "job_type_id" INTEGER NOT NULL,
    "assignee_id" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_job_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bud_job_assignments" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "bud_id" INTEGER NOT NULL,
    "job_type_id" INTEGER NOT NULL,
    "assignee_id" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 50,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bud_job_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sla_shift_logs" (
    "id" SERIAL NOT NULL,
    "job_id" INTEGER NOT NULL,
    "urgent_job_id" INTEGER,
    "original_due_date" TIMESTAMPTZ NOT NULL,
    "new_due_date" TIMESTAMPTZ NOT NULL,
    "shift_days" INTEGER NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sla_shift_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_requests" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "otp_code" VARCHAR(255),
    "otp_expires_at" TIMESTAMPTZ,
    "status" VARCHAR(50) DEFAULT 'pending',
    "token" VARCHAR(255),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "holidays" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "date" DATE NOT NULL,
    "is_recurring" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "holidays_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_files" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "job_id" INTEGER,
    "project_id" INTEGER,
    "file_name" VARCHAR(500) NOT NULL,
    "file_path" VARCHAR(1000) NOT NULL,
    "file_size" BIGINT,
    "file_type" VARCHAR(100),
    "mime_type" VARCHAR(100),
    "thumbnail_path" VARCHAR(1000),
    "uploaded_by" INTEGER NOT NULL,
    "download_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_scope_assignments" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "role_type" VARCHAR(100) NOT NULL,
    "scope_level" VARCHAR(50) NOT NULL,
    "scope_id" INTEGER,
    "scope_name" VARCHAR(255),
    "assigned_by" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_scope_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rejection_requests" (
    "id" SERIAL NOT NULL,
    "job_id" INTEGER NOT NULL,
    "requested_by" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'pending',
    "approver_level" INTEGER,
    "approver_ids" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "approval_logic" VARCHAR(10),
    "approved_by" INTEGER,
    "approved_at" TIMESTAMPTZ,
    "auto_close_at" TIMESTAMPTZ,
    "auto_close_enabled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tenant_id" INTEGER NOT NULL,

    CONSTRAINT "rejection_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_registration_requests" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "title" VARCHAR(50),
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "phone" VARCHAR(20),
    "department" VARCHAR(100),
    "position" VARCHAR(100),
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "approved_by" INTEGER,
    "rejected_reason" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "user_registration_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "magic_link_tokens" (
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
CREATE UNIQUE INDEX "tenants_code_key" ON "tenants"("code");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_subdomain_key" ON "tenants"("subdomain");

-- CreateIndex
CREATE INDEX "users_department_id_idx" ON "users"("department_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_tenant_id_email_key" ON "users"("tenant_id", "email");

-- CreateIndex
CREATE UNIQUE INDEX "roles_tenant_id_name_key" ON "roles"("tenant_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "buds_tenant_id_code_key" ON "buds"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "projects_bud_id_idx" ON "projects"("bud_id");

-- CreateIndex
CREATE INDEX "projects_department_id_idx" ON "projects"("department_id");

-- CreateIndex
CREATE UNIQUE INDEX "projects_tenant_id_code_key" ON "projects"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "job_types_tenant_id_idx" ON "job_types"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "jobs_dj_id_key" ON "jobs"("dj_id");

-- CreateIndex
CREATE INDEX "jobs_tenant_id_idx" ON "jobs"("tenant_id");

-- CreateIndex
CREATE INDEX "jobs_status_idx" ON "jobs"("status");

-- CreateIndex
CREATE INDEX "jobs_requester_id_idx" ON "jobs"("requester_id");

-- CreateIndex
CREATE INDEX "jobs_assignee_id_idx" ON "jobs"("assignee_id");

-- CreateIndex
CREATE INDEX "jobs_due_date_idx" ON "jobs"("due_date");

-- CreateIndex
CREATE INDEX "jobs_created_at_idx" ON "jobs"("created_at");

-- CreateIndex
CREATE INDEX "jobs_parent_job_id_idx" ON "jobs"("parent_job_id");

-- CreateIndex
CREATE INDEX "jobs_tenant_id_status_due_date_idx" ON "jobs"("tenant_id", "status", "due_date");

-- CreateIndex
CREATE INDEX "jobs_assignee_id_status_idx" ON "jobs"("assignee_id", "status");

-- CreateIndex
CREATE INDEX "jobs_requester_id_created_at_idx" ON "jobs"("requester_id", "created_at");

-- CreateIndex
CREATE INDEX "jobs_rejected_by_idx" ON "jobs"("rejected_by");

-- CreateIndex
CREATE INDEX "jobs_rejection_denied_at_idx" ON "jobs"("rejection_denied_at");

-- CreateIndex
CREATE INDEX "jobs_rejection_denied_by_idx" ON "jobs"("rejection_denied_by");

-- CreateIndex
CREATE INDEX "jobs_acceptance_date_idx" ON "jobs"("acceptance_date");

-- CreateIndex
CREATE INDEX "jobs_extension_count_idx" ON "jobs"("extension_count");

-- CreateIndex
CREATE UNIQUE INDEX "jobs_tenant_id_dj_id_key" ON "jobs"("tenant_id", "dj_id");

-- CreateIndex
CREATE INDEX "approval_flows_tenant_id_idx" ON "approval_flows"("tenant_id");

-- CreateIndex
CREATE INDEX "approval_flows_project_id_idx" ON "approval_flows"("project_id");

-- CreateIndex
CREATE INDEX "approval_flows_project_id_job_type_id_idx" ON "approval_flows"("project_id", "job_type_id");

-- CreateIndex
CREATE UNIQUE INDEX "approval_flows_project_id_job_type_id_key" ON "approval_flows"("project_id", "job_type_id");

-- CreateIndex
CREATE INDEX "approvals_job_id_approver_id_idx" ON "approvals"("job_id", "approver_id");

-- CreateIndex
CREATE INDEX "approvals_status_created_at_idx" ON "approvals"("status", "created_at");

-- CreateIndex
CREATE INDEX "approvals_job_id_status_idx" ON "approvals"("job_id", "status");

-- CreateIndex
CREATE INDEX "approvals_tenant_id_status_idx" ON "approvals"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "approvals_approver_id_status_idx" ON "approvals"("approver_id", "status");

-- CreateIndex
CREATE INDEX "job_activities_job_id_created_at_idx" ON "job_activities"("job_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "job_activities_user_id_created_at_idx" ON "job_activities"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "job_activities_job_id_activity_type_idx" ON "job_activities"("job_id", "activity_type");

-- CreateIndex
CREATE INDEX "job_activities_tenant_id_created_at_idx" ON "job_activities"("tenant_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "job_comments_job_id_created_at_idx" ON "job_comments"("job_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "job_comments_user_id_created_at_idx" ON "job_comments"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "job_comments_tenant_id_job_id_idx" ON "job_comments"("tenant_id", "job_id");

-- CreateIndex
CREATE INDEX "departments_tenant_id_idx" ON "departments"("tenant_id");

-- CreateIndex
CREATE INDEX "departments_bud_id_idx" ON "departments"("bud_id");

-- CreateIndex
CREATE INDEX "departments_manager_id_idx" ON "departments"("manager_id");

-- CreateIndex
CREATE INDEX "design_job_items_job_id_idx" ON "design_job_items"("job_id");

-- CreateIndex
CREATE INDEX "design_job_items_job_type_item_id_idx" ON "design_job_items"("job_type_item_id");

-- CreateIndex
CREATE INDEX "job_type_items_job_type_id_idx" ON "job_type_items"("job_type_id");

-- CreateIndex
CREATE INDEX "activity_logs_job_id_idx" ON "activity_logs"("job_id");

-- CreateIndex
CREATE INDEX "activity_logs_user_id_idx" ON "activity_logs"("user_id");

-- CreateIndex
CREATE INDEX "activity_logs_created_at_idx" ON "activity_logs"("created_at");

-- CreateIndex
CREATE INDEX "audit_logs_tenant_id_idx" ON "audit_logs"("tenant_id");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "notification_logs_notification_id_idx" ON "notification_logs"("notification_id");

-- CreateIndex
CREATE INDEX "project_job_assignments_project_id_idx" ON "project_job_assignments"("project_id");

-- CreateIndex
CREATE INDEX "project_job_assignments_job_type_id_idx" ON "project_job_assignments"("job_type_id");

-- CreateIndex
CREATE INDEX "project_job_assignments_assignee_id_idx" ON "project_job_assignments"("assignee_id");

-- CreateIndex
CREATE INDEX "project_job_assignments_assignee_id_is_active_idx" ON "project_job_assignments"("assignee_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "project_job_assignments_project_id_job_type_id_key" ON "project_job_assignments"("project_id", "job_type_id");

-- CreateIndex
CREATE INDEX "bud_job_assignments_bud_id_idx" ON "bud_job_assignments"("bud_id");

-- CreateIndex
CREATE INDEX "bud_job_assignments_job_type_id_idx" ON "bud_job_assignments"("job_type_id");

-- CreateIndex
CREATE INDEX "bud_job_assignments_assignee_id_idx" ON "bud_job_assignments"("assignee_id");

-- CreateIndex
CREATE INDEX "bud_job_assignments_assignee_id_is_active_idx" ON "bud_job_assignments"("assignee_id", "is_active");

-- CreateIndex
CREATE INDEX "bud_job_assignments_tenant_id_idx" ON "bud_job_assignments"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "bud_job_assignments_tenant_id_bud_id_job_type_id_key" ON "bud_job_assignments"("tenant_id", "bud_id", "job_type_id");

-- CreateIndex
CREATE INDEX "sla_shift_logs_job_id_idx" ON "sla_shift_logs"("job_id");

-- CreateIndex
CREATE INDEX "sla_shift_logs_urgent_job_id_idx" ON "sla_shift_logs"("urgent_job_id");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_requests_token_key" ON "password_reset_requests"("token");

-- CreateIndex
CREATE INDEX "password_reset_requests_user_id_idx" ON "password_reset_requests"("user_id");

-- CreateIndex
CREATE INDEX "password_reset_requests_token_idx" ON "password_reset_requests"("token");

-- CreateIndex
CREATE INDEX "password_reset_requests_otp_code_idx" ON "password_reset_requests"("otp_code");

-- CreateIndex
CREATE INDEX "user_scope_assignments_user_id_idx" ON "user_scope_assignments"("user_id");

-- CreateIndex
CREATE INDEX "user_scope_assignments_tenant_id_idx" ON "user_scope_assignments"("tenant_id");

-- CreateIndex
CREATE INDEX "rejection_requests_job_id_idx" ON "rejection_requests"("job_id");

-- CreateIndex
CREATE INDEX "rejection_requests_requested_by_idx" ON "rejection_requests"("requested_by");

-- CreateIndex
CREATE INDEX "rejection_requests_status_idx" ON "rejection_requests"("status");

-- CreateIndex
CREATE INDEX "rejection_requests_tenant_id_idx" ON "rejection_requests"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_auto_close" ON "rejection_requests"("auto_close_at", "status");

-- CreateIndex
CREATE INDEX "user_registration_requests_tenant_id_idx" ON "user_registration_requests"("tenant_id");

-- CreateIndex
CREATE INDEX "user_registration_requests_status_idx" ON "user_registration_requests"("status");

-- CreateIndex
CREATE INDEX "user_registration_requests_email_idx" ON "user_registration_requests"("email");

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
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roles" ADD CONSTRAINT "roles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buds" ADD CONSTRAINT "buds_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_bud_id_fkey" FOREIGN KEY ("bud_id") REFERENCES "buds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_types" ADD CONSTRAINT "job_types_next_job_type_id_fkey" FOREIGN KEY ("next_job_type_id") REFERENCES "job_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_types" ADD CONSTRAINT "job_types_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_predecessor_id_fkey" FOREIGN KEY ("predecessor_id") REFERENCES "jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_next_job_id_fkey" FOREIGN KEY ("next_job_id") REFERENCES "jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_job_type_id_fkey" FOREIGN KEY ("job_type_id") REFERENCES "job_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_close_requested_by_fkey" FOREIGN KEY ("close_requested_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_closed_by_fkey" FOREIGN KEY ("closed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_completed_by_fkey" FOREIGN KEY ("completed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_rejected_by_fkey" FOREIGN KEY ("rejected_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_rejection_denied_by_fkey" FOREIGN KEY ("rejection_denied_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_parent_job_id_fkey" FOREIGN KEY ("parent_job_id") REFERENCES "jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_attachments" ADD CONSTRAINT "job_attachments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_attachments" ADD CONSTRAINT "job_attachments_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_attachments" ADD CONSTRAINT "job_attachments_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_deliverables" ADD CONSTRAINT "job_deliverables_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_deliverables" ADD CONSTRAINT "job_deliverables_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_deliverables" ADD CONSTRAINT "job_deliverables_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_flows" ADD CONSTRAINT "approval_flows_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_flows" ADD CONSTRAINT "approval_flows_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_flows" ADD CONSTRAINT "approval_flows_job_type_id_fkey" FOREIGN KEY ("job_type_id") REFERENCES "job_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_flows" ADD CONSTRAINT "approval_flows_auto_assign_user_id_fkey" FOREIGN KEY ("auto_assign_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_approver_id_fkey" FOREIGN KEY ("approver_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_activities" ADD CONSTRAINT "job_activities_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_activities" ADD CONSTRAINT "job_activities_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_activities" ADD CONSTRAINT "job_activities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_comments" ADD CONSTRAINT "job_comments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_comments" ADD CONSTRAINT "job_comments_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_comments" ADD CONSTRAINT "job_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_bud_id_fkey" FOREIGN KEY ("bud_id") REFERENCES "buds"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "design_job_items" ADD CONSTRAINT "design_job_items_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "design_job_items" ADD CONSTRAINT "design_job_items_job_type_item_id_fkey" FOREIGN KEY ("job_type_item_id") REFERENCES "job_type_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_type_items" ADD CONSTRAINT "job_type_items_job_type_id_fkey" FOREIGN KEY ("job_type_id") REFERENCES "job_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_notification_id_fkey" FOREIGN KEY ("notification_id") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_job_assignments" ADD CONSTRAINT "project_job_assignments_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_job_assignments" ADD CONSTRAINT "project_job_assignments_job_type_id_fkey" FOREIGN KEY ("job_type_id") REFERENCES "job_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_job_assignments" ADD CONSTRAINT "project_job_assignments_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bud_job_assignments" ADD CONSTRAINT "bud_job_assignments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bud_job_assignments" ADD CONSTRAINT "bud_job_assignments_bud_id_fkey" FOREIGN KEY ("bud_id") REFERENCES "buds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bud_job_assignments" ADD CONSTRAINT "bud_job_assignments_job_type_id_fkey" FOREIGN KEY ("job_type_id") REFERENCES "job_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bud_job_assignments" ADD CONSTRAINT "bud_job_assignments_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sla_shift_logs" ADD CONSTRAINT "sla_shift_logs_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sla_shift_logs" ADD CONSTRAINT "sla_shift_logs_urgent_job_id_fkey" FOREIGN KEY ("urgent_job_id") REFERENCES "jobs"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_requests" ADD CONSTRAINT "password_reset_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "holidays" ADD CONSTRAINT "holidays_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_files" ADD CONSTRAINT "media_files_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_files" ADD CONSTRAINT "media_files_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_files" ADD CONSTRAINT "media_files_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_files" ADD CONSTRAINT "media_files_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_scope_assignments" ADD CONSTRAINT "user_scope_assignments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_scope_assignments" ADD CONSTRAINT "user_scope_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rejection_requests" ADD CONSTRAINT "rejection_requests_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rejection_requests" ADD CONSTRAINT "rejection_requests_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rejection_requests" ADD CONSTRAINT "rejection_requests_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rejection_requests" ADD CONSTRAINT "rejection_requests_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_registration_requests" ADD CONSTRAINT "user_registration_requests_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "magic_link_tokens" ADD CONSTRAINT "magic_link_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
