# Officers Task 1 review package

Base/current working tree; commits unavailable. Review Task 1 hunks/files only.

warning: in the working copy of 'db/schema.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'drizzle/meta/_journal.json', LF will be replaced by CRLF the next time Git touches it
diff --git a/db/schema.ts b/db/schema.ts
index bfc1e97..083d3f7 100644
--- a/db/schema.ts
+++ b/db/schema.ts
@@ -1,8 +1,8 @@
-import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
+import { index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";
 
 export const organizations = sqliteTable("organizations", { id: text("id").primaryKey(), name: text("name").notNull(), createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull() });
-export const memberships = sqliteTable("memberships", { id: text("id").primaryKey(), organizationId: text("organization_id").notNull(), userId: text("user_id").notNull(), email: text("email").notNull(), active: integer("active", { mode: "boolean" }).notNull().default(true), createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull() });
-export const invitations = sqliteTable("invitations", { id: text("id").primaryKey(), organizationId: text("organization_id").notNull(), email: text("email").notNull(), tokenHash: text("token_hash").notNull(), expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(), acceptedAt: integer("accepted_at", { mode: "timestamp_ms" }), createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull() });
+export const memberships = sqliteTable("memberships", { id: text("id").primaryKey(), organizationId: text("organization_id").notNull(), userId: text("user_id").notNull(), email: text("email").notNull(), active: integer("active", { mode: "boolean" }).notNull().default(true), createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(), updatedAt: integer("updated_at", { mode: "timestamp_ms" }), deactivatedAt: integer("deactivated_at", { mode: "timestamp_ms" }) }, (table) => ({ membershipsOrgEmailIdx: index("idx_memberships_org_email").on(table.organizationId, table.email), membershipsOrgActiveIdx: index("idx_memberships_org_active").on(table.organizationId, table.active) }));
+export const invitations = sqliteTable("invitations", { id: text("id").primaryKey(), organizationId: text("organization_id").notNull(), email: text("email").notNull(), tokenHash: text("token_hash").notNull(), expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(), acceptedAt: integer("accepted_at", { mode: "timestamp_ms" }), createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(), createdBy: text("created_by"), invalidatedAt: integer("invalidated_at", { mode: "timestamp_ms" }) }, (table) => ({ invitationsOrgEmailIdx: index("idx_invitations_org_email").on(table.organizationId, table.email) }));
 export const uploads = sqliteTable("uploads", { id: text("id").primaryKey(), organizationId: text("organization_id").notNull(), kind: text("kind").notNull(), filename: text("filename").notNull(), r2Key: text("r2_key").notNull(), sha256: text("sha256").notNull(), createdBy: text("created_by").notNull(), createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull() });
-export const analyses = sqliteTable("analyses", { id: text("id").primaryKey(), organizationId: text("organization_id").notNull(), schoolYearStart: text("school_year_start").notNull(), schoolYearEnd: text("school_year_end").notNull(), capHours: integer("cap_hours").notNull().default(25), createdBy: text("created_by").notNull(), createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull() });
+export const analyses = sqliteTable("analyses", { id: text("id").primaryKey(), organizationId: text("organization_id").notNull(), schoolYearStart: text("school_year_start").notNull(), schoolYearEnd: text("school_year_end").notNull(), capHours: real("cap_hours").notNull().default(25), status: text("status").notNull().default("completed"), summaryJson: text("summary_json").notNull().default("{}"), configurationJson: text("configuration_json").notNull().default("{}"), resultsJson: text("results_json").notNull().default("{}"), teamUploadId: text("team_upload_id"), upcomingUploadId: text("upcoming_upload_id"), rosterUploadId: text("roster_upload_id"), createdBy: text("created_by").notNull(), createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull() }, (table) => ({ analysesOrgCreatedAtIdx: index("idx_analyses_org_created_at").on(table.organizationId, table.createdAt), analysesOrgIdIdx: index("idx_analyses_org_id").on(table.organizationId, table.id) }));
 export const auditEvents = sqliteTable("audit_events", { id: text("id").primaryKey(), organizationId: text("organization_id").notNull(), actorUserId: text("actor_user_id").notNull(), action: text("action").notNull(), entityId: text("entity_id"), metadataJson: text("metadata_json").notNull(), createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull() });
diff --git a/drizzle/meta/_journal.json b/drizzle/meta/_journal.json
index 4377507..659f1d3 100644
--- a/drizzle/meta/_journal.json
+++ b/drizzle/meta/_journal.json
@@ -1,5 +1,34 @@
 {
   "version": "7",
   "dialect": "sqlite",
-  "entries": []
-}
+  "entries": [
+    {
+      "idx": 0,
+      "version": "6",
+      "when": 1787713564162,
+      "tag": "0000_puzzling_thundra",
+      "breakpoints": true
+    },
+    {
+      "idx": 1,
+      "version": "6",
+      "when": 1787713709748,
+      "tag": "0001_thankful_sleepwalker",
+      "breakpoints": true
+    },
+    {
+      "idx": 2,
+      "version": "6",
+      "when": 1787747364109,
+      "tag": "0002_roster_performance",
+      "breakpoints": true
+    },
+    {
+      "idx": 3,
+      "version": "6",
+      "when": 1787800296831,
+      "tag": "0003_officer_lifecycle",
+      "breakpoints": true
+    }
+  ]
+}
\ No newline at end of file

warning: in the working copy of 'src/server/officer-types.ts', LF will be replaced by CRLF the next time Git touches it
diff --git a/src/server/officer-types.ts b/src/server/officer-types.ts
new file mode 100644
index 0000000..230ae06
--- /dev/null
+++ b/src/server/officer-types.ts
@@ -0,0 +1,33 @@
+export type OfficerMembership = {
+  id: string;
+  email: string;
+  userId: string;
+  active: boolean;
+  createdAt: string;
+  updatedAt: string | null;
+  deactivatedAt: string | null;
+};
+
+export type OfficerInvitation = {
+  id: string;
+  email: string;
+  status: "pending" | "expired";
+  expiresAt: string;
+  createdAt: string;
+  createdBy: string | null;
+};
+
+export type OfficersSnapshot = {
+  memberships: OfficerMembership[];
+  invitations: OfficerInvitation[];
+};
+
+export class OfficerConflictError extends Error {
+  constructor(
+    public readonly code: "ACTIVE_MEMBER_EXISTS" | "LAST_ACTIVE_OFFICER" | "INVITATION_INVALID" | "INVITATION_EMAIL_MISMATCH",
+    message: string,
+  ) {
+    super(message);
+    this.name = "OfficerConflictError";
+  }
+}

warning: in the working copy of 'drizzle/0003_officer_lifecycle.sql', LF will be replaced by CRLF the next time Git touches it
diff --git a/drizzle/0003_officer_lifecycle.sql b/drizzle/0003_officer_lifecycle.sql
new file mode 100644
index 0000000..30d55f9
--- /dev/null
+++ b/drizzle/0003_officer_lifecycle.sql
@@ -0,0 +1,7 @@
+ALTER TABLE `invitations` ADD `created_by` text;--> statement-breakpoint
+ALTER TABLE `invitations` ADD `invalidated_at` integer;--> statement-breakpoint
+CREATE INDEX `idx_invitations_org_email` ON `invitations` (`organization_id`,`email`);--> statement-breakpoint
+ALTER TABLE `memberships` ADD `updated_at` integer;--> statement-breakpoint
+ALTER TABLE `memberships` ADD `deactivated_at` integer;--> statement-breakpoint
+CREATE INDEX `idx_memberships_org_email` ON `memberships` (`organization_id`,`email`);--> statement-breakpoint
+CREATE INDEX `idx_memberships_org_active` ON `memberships` (`organization_id`,`active`);
\ No newline at end of file

warning: in the working copy of 'drizzle/meta/0003_snapshot.json', LF will be replaced by CRLF the next time Git touches it
diff --git a/drizzle/meta/0003_snapshot.json b/drizzle/meta/0003_snapshot.json
new file mode 100644
index 0000000..288771f
--- /dev/null
+++ b/drizzle/meta/0003_snapshot.json
@@ -0,0 +1,470 @@
+{
+  "version": "6",
+  "dialect": "sqlite",
+  "id": "39ce391e-5490-4789-a067-a46e851da446",
+  "prevId": "1f65d3ce-e3a6-48e1-a692-778d67403ec9",
+  "tables": {
+    "analyses": {
+      "name": "analyses",
+      "columns": {
+        "id": {
+          "name": "id",
+          "type": "text",
+          "primaryKey": true,
+          "notNull": true,
+          "autoincrement": false
+        },
+        "organization_id": {
+          "name": "organization_id",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": true,
+          "autoincrement": false
+        },
+        "school_year_start": {
+          "name": "school_year_start",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": true,
+          "autoincrement": false
+        },
+        "school_year_end": {
+          "name": "school_year_end",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": true,
+          "autoincrement": false
+        },
+        "cap_hours": {
+          "name": "cap_hours",
+          "type": "real",
+          "primaryKey": false,
+          "notNull": true,
+          "autoincrement": false,
+          "default": 25
+        },
+        "status": {
+          "name": "status",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": true,
+          "autoincrement": false,
+          "default": "'completed'"
+        },
+        "summary_json": {
+          "name": "summary_json",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": true,
+          "autoincrement": false,
+          "default": "'{}'"
+        },
+        "configuration_json": {
+          "name": "configuration_json",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": true,
+          "autoincrement": false,
+          "default": "'{}'"
+        },
+        "results_json": {
+          "name": "results_json",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": true,
+          "autoincrement": false,
+          "default": "'{}'"
+        },
+        "team_upload_id": {
+          "name": "team_upload_id",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "upcoming_upload_id": {
+          "name": "upcoming_upload_id",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "roster_upload_id": {
+          "name": "roster_upload_id",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "created_by": {
+          "name": "created_by",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": true,
+          "autoincrement": false
+        },
+        "created_at": {
+          "name": "created_at",
+          "type": "integer",
+          "primaryKey": false,
+          "notNull": true,
+          "autoincrement": false
+        }
+      },
+      "indexes": {
+        "idx_analyses_org_created_at": {
+          "name": "idx_analyses_org_created_at",
+          "columns": [
+            "organization_id",
+            "created_at"
+          ],
+          "isUnique": false
+        },
+        "idx_analyses_org_id": {
+          "name": "idx_analyses_org_id",
+          "columns": [
+            "organization_id",
+            "id"
+          ],
+          "isUnique": false
+        }
+      },
+      "foreignKeys": {},
+      "compositePrimaryKeys": {},
+      "uniqueConstraints": {},
+      "checkConstraints": {}
+    },
+    "audit_events": {
+      "name": "audit_events",
+      "columns": {
+        "id": {
+          "name": "id",
+          "type": "text",
+          "primaryKey": true,
+          "notNull": true,
+          "autoincrement": false
+        },
+        "organization_id": {
+          "name": "organization_id",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": true,
+          "autoincrement": false
+        },
+        "actor_user_id": {
+          "name": "actor_user_id",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": true,
+          "autoincrement": false
+        },
+        "action": {
+          "name": "action",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": true,
+          "autoincrement": false
+        },
+        "entity_id": {
+          "name": "entity_id",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "metadata_json": {
+          "name": "metadata_json",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": true,
+          "autoincrement": false
+        },
+        "created_at": {
+          "name": "created_at",
+          "type": "integer",
+          "primaryKey": false,
+          "notNull": true,
+          "autoincrement": false
+        }
+      },
+      "indexes": {},
+      "foreignKeys": {},
+      "compositePrimaryKeys": {},
+      "uniqueConstraints": {},
+      "checkConstraints": {}
+    },
+    "invitations": {
+      "name": "invitations",
+      "columns": {
+        "id": {
+          "name": "id",
+          "type": "text",
+          "primaryKey": true,
+          "notNull": true,
+          "autoincrement": false
+        },
+        "organization_id": {
+          "name": "organization_id",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": true,
+          "autoincrement": false
+        },
+        "email": {
+          "name": "email",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": true,
+          "autoincrement": false
+        },
+        "token_hash": {
+          "name": "token_hash",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": true,
+          "autoincrement": false
+        },
+        "expires_at": {
+          "name": "expires_at",
+          "type": "integer",
+          "primaryKey": false,
+          "notNull": true,
+          "autoincrement": false
+        },
+        "accepted_at": {
+          "name": "accepted_at",
+          "type": "integer",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "created_at": {
+          "name": "created_at",
+          "type": "integer",
+          "primaryKey": false,
+          "notNull": true,
+          "autoincrement": false
+        },
+        "created_by": {
+          "name": "created_by",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "invalidated_at": {
+          "name": "invalidated_at",
+          "type": "integer",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        }
+      },
+      "indexes": {
+        "idx_invitations_org_email": {
+          "name": "idx_invitations_org_email",
+          "columns": [
+            "organization_id",
+            "email"
+          ],
+          "isUnique": false
+        }
+      },
+      "foreignKeys": {},
+      "compositePrimaryKeys": {},
+      "uniqueConstraints": {},
+      "checkConstraints": {}
+    },
+    "memberships": {
+      "name": "memberships",
+      "columns": {
+        "id": {
+          "name": "id",
+          "type": "text",
+          "primaryKey": true,
+          "notNull": true,
+          "autoincrement": false
+        },
+        "organization_id": {
+          "name": "organization_id",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": true,
+          "autoincrement": false
+        },
+        "user_id": {
+          "name": "user_id",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": true,
+          "autoincrement": false
+        },
+        "email": {
+          "name": "email",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": true,
+          "autoincrement": false
+        },
+        "active": {
+          "name": "active",
+          "type": "integer",
+          "primaryKey": false,
+          "notNull": true,
+          "autoincrement": false,
+          "default": true
+        },
+        "created_at": {
+          "name": "created_at",
+          "type": "integer",
+          "primaryKey": false,
+          "notNull": true,
+          "autoincrement": false
+        },
+        "updated_at": {
+          "name": "updated_at",
+          "type": "integer",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "deactivated_at": {
+          "name": "deactivated_at",
+          "type": "integer",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        }
+      },
+      "indexes": {
+        "idx_memberships_org_email": {
+          "name": "idx_memberships_org_email",
+          "columns": [
+            "organization_id",
+            "email"
+          ],
+          "isUnique": false
+        },
+        "idx_memberships_org_active": {
+          "name": "idx_memberships_org_active",
+          "columns": [
+            "organization_id",
+            "active"
+          ],
+          "isUnique": false
+        }
+      },
+      "foreignKeys": {},
+      "compositePrimaryKeys": {},
+      "uniqueConstraints": {},
+      "checkConstraints": {}
+    },
+    "organizations": {
+      "name": "organizations",
+      "columns": {
+        "id": {
+          "name": "id",
+          "type": "text",
+          "primaryKey": true,
+          "notNull": true,
+          "autoincrement": false
+        },
+        "name": {
+          "name": "name",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": true,
+          "autoincrement": false
+        },
+        "created_at": {
+          "name": "created_at",
+          "type": "integer",
+          "primaryKey": false,
+          "notNull": true,
+          "autoincrement": false
+        }
+      },
+      "indexes": {},
+      "foreignKeys": {},
+      "compositePrimaryKeys": {},
+      "uniqueConstraints": {},
+      "checkConstraints": {}
+    },
+    "uploads": {
+      "name": "uploads",
+      "columns": {
+        "id": {
+          "name": "id",
+          "type": "text",
+          "primaryKey": true,
+          "notNull": true,
+          "autoincrement": false
+        },
+        "organization_id": {
+          "name": "organization_id",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": true,
+          "autoincrement": false
+        },
+        "kind": {
+          "name": "kind",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": true,
+          "autoincrement": false
+        },
+        "filename": {
+          "name": "filename",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": true,
+          "autoincrement": false
+        },
+        "r2_key": {
+          "name": "r2_key",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": true,
+          "autoincrement": false
+        },
+        "sha256": {
+          "name": "sha256",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": true,
+          "autoincrement": false
+        },
+        "created_by": {
+          "name": "created_by",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": true,
+          "autoincrement": false
+        },
+        "created_at": {
+          "name": "created_at",
+          "type": "integer",
+          "primaryKey": false,
+          "notNull": true,
+          "autoincrement": false
+        }
+      },
+      "indexes": {},
+      "foreignKeys": {},
+      "compositePrimaryKeys": {},
+      "uniqueConstraints": {},
+      "checkConstraints": {}
+    }
+  },
+  "views": {},
+  "enums": {},
+  "_meta": {
+    "schemas": {},
+    "tables": {},
+    "columns": {}
+  },
+  "internal": {
+    "indexes": {}
+  }
+}
\ No newline at end of file

