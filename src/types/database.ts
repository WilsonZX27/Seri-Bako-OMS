export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type UserRole = "super_admin" | "finance" | "manager" | "purchasing" | "kitchen" | "outlet_staff";
export type ItemStatus = "active" | "inactive";
export type SupplierStatus = "active" | "inactive";
export type RecordStatus = "active" | "inactive" | "archived" | "invited" | "disabled";
export type StaffStatus = RecordStatus | "invited" | "disabled";
export type BranchType = "central_kitchen" | "outlet" | "event_booth" | "office" | "other";
export type StaffAccessLevel = "full" | "manage" | "read_only";
export type PermissionOverrideEffect = "allow" | "deny";
export type ResetFrequency = "never" | "yearly" | "quarterly" | "monthly" | "daily";
export type StockEntityType = "item" | "product";
export type DocumentStatus = "draft" | "submitted" | "pending_approval" | "approved" | "rejected" | "posted" | "cancelled" | "closed";
export type ApprovalStatus = "not_required" | "draft" | "pending" | "approved" | "rejected" | "cancelled";
export type PurchaseRequestStatus = "draft" | "manager_review" | "admin_review" | "finance_review" | "ready_to_convert" | "converted_to_po" | "rejected" | "returned" | "cancelled";
export type PurchaseOrderStatus = "draft" | "pending_approval" | "approved" | "sent" | "partial_received" | "received" | "cancelled" | "closed";
export type GoodsReceivingStatus = "draft" | "posted" | "cancelled";
export type PurchaseReturnStatus = "draft" | "posted" | "cancelled";
export type SupplierInvoiceStatus = "draft" | "open" | "partially_paid" | "paid" | "void";
export type StockTransactionStatus = "draft" | "posted" | "cancelled";
export type StockCountStatus = "draft" | "submitted" | "reviewed" | "approved" | "posted" | "voided" | "rejected" | "cancelled";
export type StockOperationStatus = "draft" | "submitted" | "approved" | "in_transit" | "posted" | "completed" | "rejected" | "cancelled";
export type StockWastageReason = "expired" | "damaged" | "spoiled" | "production_loss" | "missing" | "staff_meal" | "sampling" | "supplier_claim" | "other";
export type OutletDailyRecordStatus = "draft" | "morning_recorded" | "evening_completed" | "reviewed" | "void";
export type OutletDailyWastageReason = "unsold" | "damaged" | "expired" | "quality_issue" | "staff_meal" | "other";
export type RecipeStatus = "draft" | "pending_approval" | "approved" | "active" | "rejected" | "archived";
type TableDefinition<Row extends Record<string, unknown>> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: [];
};
export type StockTransactionType =
  | "opening_balance"
  | "purchase"
  | "production_usage"
  | "production_output"
  | "transfer_in"
  | "transfer_out"
  | "stock_adjustment"
  | "stock_count_adjustment"
  | "wastage"
  | "damage"
  | "missing"
  | "extra"
  | "correction"
  | "transfer"
  | "return_supplier"
  | "return_to_supplier"
  | "customer_return";

export type Database = {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string;
          company_code: string;
          company_name: string;
          registration_no: string | null;
          tax_no: string | null;
          phone: string | null;
          email: string | null;
          address: string | null;
          logo_url: string | null;
          logo_path: string | null;
          status: RecordStatus;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          updated_by: string | null;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          company_code: string;
          company_name: string;
          registration_no?: string | null;
          tax_no?: string | null;
          phone?: string | null;
          email?: string | null;
          address?: string | null;
          logo_url?: string | null;
          logo_path?: string | null;
          status?: RecordStatus;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          updated_by?: string | null;
          deleted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["companies"]["Insert"]>;
        Relationships: [];
      };
      branches: {
        Row: {
          id: string;
          company_id: string;
          branch_code: string;
          branch_name: string;
          branch_type: BranchType;
          phone: string | null;
          email: string | null;
          address: string | null;
          status: RecordStatus;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          updated_by: string | null;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          company_id: string;
          branch_code: string;
          branch_name: string;
          branch_type?: BranchType;
          phone?: string | null;
          email?: string | null;
          address?: string | null;
          status?: RecordStatus;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          updated_by?: string | null;
          deleted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["branches"]["Insert"]>;
        Relationships: [];
      };
      staffs: {
        Row: {
          id: string;
          company_id: string;
          auth_user_id: string | null;
          staff_code: string | null;
          full_name: string;
          email: string | null;
            phone: string | null;
            avatar_url: string | null;
            avatar_path: string | null;
            default_branch_id: string | null;
          status: StaffStatus;
          invited_at: string | null;
          invited_by: string | null;
          accepted_at: string | null;
          last_login_at: string | null;
          invite_email: string | null;
          must_change_password: boolean;
          password_changed_at: string | null;
          auth_setup_method: string | null;
          temp_password_issued_at: string | null;
          invitation_status: string | null;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          updated_by: string | null;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          company_id: string;
          auth_user_id?: string | null;
          staff_code?: string | null;
          full_name: string;
          email?: string | null;
            phone?: string | null;
            avatar_url?: string | null;
            avatar_path?: string | null;
            default_branch_id?: string | null;
          status?: StaffStatus;
          invited_at?: string | null;
          invited_by?: string | null;
          accepted_at?: string | null;
          last_login_at?: string | null;
          invite_email?: string | null;
          must_change_password?: boolean;
          password_changed_at?: string | null;
          auth_setup_method?: string | null;
          temp_password_issued_at?: string | null;
          invitation_status?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          updated_by?: string | null;
          deleted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["staffs"]["Insert"]>;
        Relationships: [];
      };
      roles: {
        Row: {
          id: string;
          company_id: string | null;
          role_code: string;
          role_name: string;
          description: string | null;
          status: RecordStatus;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          updated_by: string | null;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          company_id?: string | null;
          role_code: string;
          role_name: string;
          description?: string | null;
          status?: RecordStatus;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          updated_by?: string | null;
          deleted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["roles"]["Insert"]>;
        Relationships: [];
      };
      permissions: {
        Row: {
          id: string;
          permission_code: string;
          module: string;
          action: string;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          permission_code: string;
          module: string;
          action: string;
          description?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["permissions"]["Insert"]>;
        Relationships: [];
      };
      role_permissions: {
        Row: { id: string; role_id: string; permission_id: string; created_at: string };
        Insert: { id?: string; role_id: string; permission_id: string; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["role_permissions"]["Insert"]>;
        Relationships: [];
      };
      staff_permission_overrides: {
        Row: {
          id: string;
          staff_id: string;
          permission_id: string;
          effect: PermissionOverrideEffect;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          updated_by: string | null;
        };
        Insert: {
          id?: string;
          staff_id: string;
          permission_id: string;
          effect: PermissionOverrideEffect;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          updated_by?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["staff_permission_overrides"]["Insert"]>;
        Relationships: [];
      };
      staff_roles: {
        Row: {
          id: string;
          staff_id: string;
          role_id: string;
          branch_id: string | null;
          is_primary: boolean;
          effective_from: string;
          effective_to: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          staff_id: string;
          role_id: string;
          branch_id?: string | null;
          is_primary?: boolean;
          effective_from?: string;
          effective_to?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["staff_roles"]["Insert"]>;
        Relationships: [];
      };
      staff_branches: {
        Row: {
          id: string;
          staff_id: string;
          branch_id: string;
          access_level: StaffAccessLevel;
          is_default: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          staff_id: string;
          branch_id: string;
          access_level?: StaffAccessLevel;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["staff_branches"]["Insert"]>;
        Relationships: [];
      };
      branch_supply_routes: {
        Row: {
          id: string;
          company_id: string;
          source_branch_id: string;
          destination_branch_id: string;
          is_primary: boolean;
          status: RecordStatus;
          effective_from: string;
          effective_to: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          updated_by: string | null;
        };
        Insert: {
          id?: string;
          company_id: string;
          source_branch_id: string;
          destination_branch_id: string;
          is_primary?: boolean;
          status?: RecordStatus;
          effective_from?: string;
          effective_to?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          updated_by?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["branch_supply_routes"]["Insert"]>;
        Relationships: [];
      };
      outlet_daily_records: {
        Row: {
          id: string;
          company_id: string;
          branch_id: string;
          source_branch_id: string | null;
          record_date: string;
          status: OutletDailyRecordStatus;
          submitted_by: string | null;
          reviewed_by: string | null;
          reviewed_at: string | null;
          void_reason: string | null;
          voided_by: string | null;
          voided_at: string | null;
          notes: string | null;
          created_by: string | null;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          branch_id: string;
          source_branch_id?: string | null;
          record_date: string;
          status?: OutletDailyRecordStatus;
          submitted_by?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          void_reason?: string | null;
          voided_by?: string | null;
          voided_at?: string | null;
          notes?: string | null;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["outlet_daily_records"]["Insert"]>;
        Relationships: [];
      };
      outlet_daily_record_lines: {
        Row: {
          id: string;
          record_id: string;
          product_id: string;
          morning_received_qty: number;
          morning_received_provided: boolean;
          qty_sent: number;
          qty_sent_estimated: number | null;
          qty_sent_confirmed: boolean;
          qty_sent_source: "unavailable" | "legacy_unverified" | "outlet_received_estimate" | "authorized_draft" | "authorized_confirmed";
          evening_leftover_qty: number;
          wastage_qty: number;
          wastage_reason: OutletDailyWastageReason | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          record_id: string;
          product_id: string;
          morning_received_qty?: number;
          morning_received_provided?: boolean;
          qty_sent?: number;
          qty_sent_estimated?: number | null;
          qty_sent_confirmed?: boolean;
          qty_sent_source?: "unavailable" | "legacy_unverified" | "outlet_received_estimate" | "authorized_draft" | "authorized_confirmed";
          evening_leftover_qty?: number;
          wastage_qty?: number;
          wastage_reason?: OutletDailyWastageReason | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["outlet_daily_record_lines"]["Insert"]>;
        Relationships: [];
      };
      document_sequences: {
        Row: {
          id: string;
          company_id: string;
          document_type: string;
          prefix: string;
          next_number: number;
          padding: number;
          reset_frequency: ResetFrequency;
          last_reset_at: string | null;
          status: RecordStatus;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          updated_by: string | null;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          company_id: string;
          document_type: string;
          prefix: string;
          next_number?: number;
          padding?: number;
          reset_frequency?: ResetFrequency;
          last_reset_at?: string | null;
          status?: RecordStatus;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          updated_by?: string | null;
          deleted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["document_sequences"]["Insert"]>;
        Relationships: [];
      };
      document_sequence_periods: {
        Row: {
          id: string;
          company_id: string;
          document_type: string;
          period_start: string;
          next_number: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          document_type: string;
          period_start: string;
          next_number?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["document_sequence_periods"]["Insert"]>;
        Relationships: [];
      };
      operation_requests: {
        Row: { id: string; company_id: string; operation_id: string; idempotency_key: string; request_fingerprint: string; module: string; action: string; status: string; safe_result: Json | null; error_code: string | null; business_data_changed: boolean; actor_staff_id: string; branch_id: string | null; started_at: string; completed_at: string | null; created_at: string };
        Insert: { id?: string; company_id: string; operation_id?: string; idempotency_key: string; request_fingerprint: string; module: string; action: string; status?: string; safe_result?: Json | null; error_code?: string | null; business_data_changed?: boolean; actor_staff_id: string; branch_id?: string | null; started_at?: string; completed_at?: string | null; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["operation_requests"]["Insert"]>;
        Relationships: [];
      };
      system_incidents: {
        Row: { id: string; company_id: string; fingerprint: string; module: string; route: string | null; branch_id: string | null; severity: string; status: string; safe_code: string; safe_message: string; recommended_action: string | null; occurrence_count: number; recovery_attempts: number; first_seen_at: string; last_seen_at: string; recovered_at: string | null; acknowledged_at: string | null; acknowledged_by: string | null; created_at: string; updated_at: string };
        Insert: { id?: string; company_id: string; fingerprint: string; module: string; route?: string | null; branch_id?: string | null; severity?: string; status?: string; safe_code: string; safe_message: string; recommended_action?: string | null; occurrence_count?: number; recovery_attempts?: number; first_seen_at?: string; last_seen_at?: string; recovered_at?: string | null; acknowledged_at?: string | null; acknowledged_by?: string | null; created_at?: string; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["system_incidents"]["Insert"]>;
        Relationships: [];
      };
      system_incident_events: {
        Row: { id: string; company_id: string; incident_id: string; operation_id: string | null; event_type: string; attempt_no: number | null; business_data_changed: boolean; safe_metadata: Json | null; actor_staff_id: string | null; created_at: string };
        Insert: { id?: string; company_id: string; incident_id: string; operation_id?: string | null; event_type: string; attempt_no?: number | null; business_data_changed?: boolean; safe_metadata?: Json | null; actor_staff_id?: string | null; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["system_incident_events"]["Insert"]>;
        Relationships: [];
      };
      draft_revisions: {
        Row: { id: string; company_id: string; actor_staff_id: string; branch_id: string | null; draft_type: string; draft_key: string; scope_fingerprint: string; revision: number; safe_payload: Json; expires_at: string; created_at: string; updated_at: string };
        Insert: { id?: string; company_id: string; actor_staff_id: string; branch_id?: string | null; draft_type: string; draft_key: string; scope_fingerprint: string; revision?: number; safe_payload?: Json; expires_at?: string; created_at?: string; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["draft_revisions"]["Insert"]>;
        Relationships: [];
      };
      activity_logs: {
        Row: {
          id: string;
          company_id: string | null;
          entity_type: string;
          entity_id: string;
          activity_type: string;
          message: string;
          metadata: Json | null;
          created_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          company_id?: string | null;
          entity_type: string;
          entity_id: string;
          activity_type: string;
          message: string;
          metadata?: Json | null;
          created_at?: string;
          created_by?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["activity_logs"]["Insert"]>;
        Relationships: [];
      };
      documents: {
        Row: {
          id: string;
          company_id: string | null;
          document_no: string;
          document_type: string;
          title: string;
          status: DocumentStatus;
          approval_status: ApprovalStatus;
          current_step: string | null;
          related_entity_type: string | null;
          related_entity_id: string | null;
          revision_no: number;
          submitted_at: string | null;
          posted_at: string | null;
          cancelled_at: string | null;
          posting_reference: string | null;
          closed_at: string | null;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          updated_by: string | null;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          company_id?: string | null;
          document_no: string;
          document_type: string;
          title: string;
          status?: DocumentStatus;
          approval_status?: ApprovalStatus;
          current_step?: string | null;
          related_entity_type?: string | null;
          related_entity_id?: string | null;
          revision_no?: number;
          submitted_at?: string | null;
          posted_at?: string | null;
          cancelled_at?: string | null;
          posting_reference?: string | null;
          closed_at?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          updated_by?: string | null;
          deleted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["documents"]["Insert"]>;
        Relationships: [];
      };
      document_comments: {
        Row: {
          id: string;
          document_id: string;
          comment_text: string;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          document_id: string;
          comment_text: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["document_comments"]["Insert"]>;
        Relationships: [];
      };
      document_revisions: {
        Row: {
          id: string;
          document_id: string;
          revision_no: number;
          changed_by: string | null;
          changed_at: string;
          change_summary: string;
        };
        Insert: {
          id?: string;
          document_id: string;
          revision_no: number;
          changed_by?: string | null;
          changed_at?: string;
          change_summary: string;
        };
        Update: Partial<Database["public"]["Tables"]["document_revisions"]["Insert"]>;
        Relationships: [];
      };
      attachments: {
        Row: {
          id: string;
          company_id: string | null;
          entity_type: string;
          entity_id: string;
          file_name: string;
          file_type: string | null;
          file_size: number;
          storage_path: string | null;
          file_url: string | null;
          status: RecordStatus;
          uploaded_by: string | null;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          updated_by: string | null;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          company_id?: string | null;
          entity_type: string;
          entity_id: string;
          file_name: string;
          file_type?: string | null;
          file_size?: number;
          storage_path?: string | null;
          file_url?: string | null;
          status?: RecordStatus;
          uploaded_by?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          updated_by?: string | null;
          deleted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["attachments"]["Insert"]>;
        Relationships: [];
      };
      approvals: {
        Row: {
          id: string;
          company_id: string | null;
          entity_type: string;
          entity_id: string;
          status: ApprovalStatus;
          current_step: number;
          submitted_at: string | null;
          submitted_by: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          updated_by: string | null;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          company_id?: string | null;
          entity_type: string;
          entity_id: string;
          status?: ApprovalStatus;
          current_step?: number;
          submitted_at?: string | null;
          submitted_by?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          updated_by?: string | null;
          deleted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["approvals"]["Insert"]>;
        Relationships: [];
      };
      approval_steps: {
        Row: {
          id: string;
          approval_id: string;
          step_no: number;
          approver_role: string | null;
          approver_staff_id: string | null;
          status: ApprovalStatus;
          remarks: string | null;
          acted_at: string | null;
          acted_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          approval_id: string;
          step_no: number;
          approver_role?: string | null;
          approver_staff_id?: string | null;
          status?: ApprovalStatus;
          remarks?: string | null;
          acted_at?: string | null;
          acted_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["approval_steps"]["Insert"]>;
        Relationships: [];
      };
      audit_logs: {
        Row: {
          id: string;
          company_id: string | null;
          entity_type: string;
          entity_id: string;
          action: string;
          old_values: Json | null;
          new_values: Json | null;
          created_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          company_id?: string | null;
          entity_type: string;
          entity_id: string;
          action: string;
          old_values?: Json | null;
          new_values?: Json | null;
          created_at?: string;
          created_by?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["audit_logs"]["Insert"]>;
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          company_id: string | null;
          recipient_user_id: string | null;
          recipient_staff_id: string | null;
          recipient_role_id: string | null;
          branch_id: string | null;
          title: string;
          message: string;
          action_url: string | null;
          priority: string;
          is_company_wide: boolean;
          entity_type: string | null;
          entity_id: string | null;
          read_at: string | null;
          dismissed_at: string | null;
          actor_user_id: string | null;
          created_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          company_id?: string | null;
          recipient_user_id?: string | null;
          recipient_staff_id?: string | null;
          recipient_role_id?: string | null;
          branch_id?: string | null;
          title: string;
          message: string;
          action_url?: string | null;
          priority?: string;
          is_company_wide?: boolean;
          entity_type?: string | null;
          entity_id?: string | null;
          read_at?: string | null;
          dismissed_at?: string | null;
          actor_user_id?: string | null;
          created_at?: string;
          created_by?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["notifications"]["Insert"]>;
        Relationships: [];
      };
      notification_recipients: {
        Row: {
          id: string;
          notification_id: string;
          recipient_user_id: string | null;
          recipient_staff_id: string | null;
          read_at: string | null;
          dismissed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          notification_id: string;
          recipient_user_id?: string | null;
          recipient_staff_id?: string | null;
          read_at?: string | null;
          dismissed_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["notification_recipients"]["Insert"]>;
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          full_name: string;
          role: UserRole;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          role?: UserRole;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      autocount_import_jobs: {
        Row: { id: string; company_id: string; status: string; content_hash: string; file_count: number; summary: Json; blocking_issues: Json; created_by: string; created_at: string; confirmed_at: string | null; completed_at: string | null };
        Insert: { id?: string; company_id: string; status?: string; content_hash: string; file_count?: number; summary?: Json; blocking_issues?: Json; created_by: string; created_at?: string; confirmed_at?: string | null; completed_at?: string | null };
        Update: Partial<Database["public"]["Tables"]["autocount_import_jobs"]["Insert"]>;
        Relationships: [];
      };
      autocount_import_files: {
        Row: { id: string; job_id: string; company_id: string; file_name: string; file_type: string; content_hash: string; row_count: number; headers: Json; created_at: string };
        Insert: { id?: string; job_id: string; company_id: string; file_name: string; file_type: string; content_hash: string; row_count: number; headers?: Json; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["autocount_import_files"]["Insert"]>;
        Relationships: [];
      };
      autocount_import_rows: {
        Row: { id: string; job_id: string; company_id: string; entity_type: string; business_key: string; source_file: string; source_row: number; normalized: Json; warnings: Json; created_at: string };
        Insert: { id?: string; job_id: string; company_id: string; entity_type: string; business_key: string; source_file: string; source_row: number; normalized: Json; warnings?: Json; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["autocount_import_rows"]["Insert"]>;
        Relationships: [];
      };
      suppliers: {
        Row: {
          id: string;
          company_id: string;
          supplier_code: string | null;
          supplier_group: string | null;
          name: string;
          contact_person: string | null;
          phone: string | null;
          email: string | null;
          address: string | null;
          payment_terms_days: number;
          status: SupplierStatus;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          company_id: string;
          supplier_code?: string | null;
          supplier_group?: string | null;
          name: string;
          contact_person?: string | null;
          phone?: string | null;
          email?: string | null;
          address?: string | null;
          payment_terms_days?: number;
          status?: SupplierStatus;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["suppliers"]["Insert"]>;
        Relationships: [];
      };
      supplier_external_references: {
        Row: { id: string; company_id: string; supplier_id: string; source_system: string; external_code: string; source_name: string | null; created_at: string; updated_at: string };
        Insert: { id?: string; company_id: string; supplier_id: string; source_system?: string; external_code: string; source_name?: string | null; created_at?: string; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["supplier_external_references"]["Insert"]>;
        Relationships: [];
      };
      items: {
        Row: {
          id: string;
          company_id: string;
          item_code: string;
          autocount_code: string | null;
          item_name: string;
          brand_name: string | null;
          category: string;
          purchase_unit: string;
          base_unit: string;
          conversion_to_base_unit: number;
          supplier_id: string | null;
          cost: number;
          safety_stock: number;
          lead_time_days: number;
          moq: number;
          status: ItemStatus;
          item_image_url: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          company_id: string;
          item_code: string;
          autocount_code?: string | null;
          item_name: string;
          brand_name?: string | null;
          category: string;
          purchase_unit: string;
          base_unit: string;
          conversion_to_base_unit?: number;
          supplier_id?: string | null;
          cost?: number;
          safety_stock?: number;
          lead_time_days?: number;
          moq?: number;
          status?: ItemStatus;
          item_image_url?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["items"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "items_supplier_company_fkey";
            columns: ["supplier_id", "company_id"];
            isOneToOne: false;
            referencedRelation: "suppliers";
            referencedColumns: ["id", "company_id"];
          },
        ];
      };
      products: {
        Row: {
          id: string;
          company_id: string;
          product_code: string;
          product_name: string;
          category: string;
          display_order: number;
          selling_unit: string;
          status: ItemStatus;
          product_image_url: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          company_id: string;
          product_code: string;
          product_name: string;
          category: string;
          display_order?: number;
          selling_unit: string;
          status?: ItemStatus;
          product_image_url?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["products"]["Insert"]>;
        Relationships: [];
      };
      supplier_items: {
        Row: {
          id: string;
          company_id: string;
          supplier_id: string;
          item_id: string;
          supplier_item_code: string;
          supplier_item_name: string;
          purchase_uom: string;
          conversion_to_base_uom: number;
          unit_cost: number;
          moq: number;
          lead_time_days: number;
          valid_from: string | null;
          valid_to: string | null;
          status: RecordStatus;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          updated_by: string | null;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          company_id: string;
          supplier_id: string;
          item_id: string;
          supplier_item_code: string;
          supplier_item_name: string;
          purchase_uom: string;
          conversion_to_base_uom?: number;
          unit_cost?: number;
          moq?: number;
          lead_time_days?: number;
          valid_from?: string | null;
          valid_to?: string | null;
          status?: RecordStatus;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          updated_by?: string | null;
          deleted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["supplier_items"]["Insert"]>;
        Relationships: [];
      };
      branch_supplier_items: {
        Row: {
          id: string;
          branch_id: string;
          supplier_item_id: string;
          item_id: string;
          is_preferred: boolean;
          status: RecordStatus;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          updated_by: string | null;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          branch_id: string;
          supplier_item_id: string;
          item_id: string;
          is_preferred?: boolean;
          status?: RecordStatus;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          updated_by?: string | null;
          deleted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["branch_supplier_items"]["Insert"]>;
        Relationships: [];
      };
      uom_conversions: {
        Row: {
          id: string;
          company_id: string;
          item_id: string | null;
          from_uom: string;
          to_uom: string;
          factor: number;
          status: RecordStatus;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          updated_by: string | null;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          company_id: string;
          item_id?: string | null;
          from_uom: string;
          to_uom: string;
          factor: number;
          status?: RecordStatus;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          updated_by?: string | null;
          deleted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["uom_conversions"]["Insert"]>;
        Relationships: [];
      };
      product_packaging: {
        Row: {
          id: string;
          product_id: string;
          packaging_name: string;
          selling_uom: string;
          units_per_pack: number;
          min_order_qty: number;
          price: number;
          status: RecordStatus;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          updated_by: string | null;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          product_id: string;
          packaging_name: string;
          selling_uom: string;
          units_per_pack?: number;
          min_order_qty?: number;
          price?: number;
          status?: RecordStatus;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          updated_by?: string | null;
          deleted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["product_packaging"]["Insert"]>;
        Relationships: [];
      };
      purchase_requests: {
        Row: {
          id: string;
          company_id: string | null;
          document_id: string | null;
          request_no: string;
          request_sort_key: string;
          requested_by: string | null;
          request_date: string;
          required_date: string | null;
          priority: "low" | "normal" | "urgent" | "critical";
          needed_by_date: string | null;
          urgency_reason: string | null;
          production_risk: boolean;
          branch_id: string | null;
          status: PurchaseRequestStatus;
          remarks: string | null;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          updated_by: string | null;
          deleted_at: string | null;
          idempotency_key: string | null;
          split_root_purchase_request_id: string | null;
          assigned_supplier_id: string | null;
        };
        Insert: {
          id?: string;
          company_id?: string | null;
          document_id?: string | null;
          request_no: string;
          request_sort_key?: never;
          requested_by?: string | null;
          request_date?: string;
          required_date?: string | null;
          priority?: "low" | "normal" | "urgent" | "critical";
          needed_by_date?: string | null;
          urgency_reason?: string | null;
          production_risk?: boolean;
          branch_id?: string | null;
          status?: PurchaseRequestStatus;
          remarks?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          updated_by?: string | null;
          deleted_at?: string | null;
          idempotency_key?: string | null;
          split_root_purchase_request_id?: string | null;
          assigned_supplier_id?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["purchase_requests"]["Insert"]>;
        Relationships: [];
      };
      purchase_request_lines: {
        Row: {
          id: string;
          purchase_request_id: string;
          item_id: string;
          qty: number;
          uom: string;
          estimated_unit_cost: number;
          suggested_supplier_id: string | null;
          reason: string | null;
          remarks: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          purchase_request_id: string;
          item_id: string;
          qty: number;
          uom: string;
          estimated_unit_cost?: number;
          suggested_supplier_id?: string | null;
          reason?: string | null;
          remarks?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["purchase_request_lines"]["Insert"]>;
        Relationships: [];
      };
      purchase_request_unresolved_lines: {
        Row: {
          id: string;
          purchase_request_id: string;
          line_no: number;
          requested_description: string;
          requested_qty: number;
          requested_uom: string;
          remarks: string | null;
          resolution_status: "unresolved" | "matched" | "dismissed";
          resolved_item_id: string | null;
          resolved_by: string | null;
          resolved_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          purchase_request_id: string;
          line_no: number;
          requested_description: string;
          requested_qty: number;
          requested_uom: string;
          remarks?: string | null;
          resolution_status?: "unresolved" | "matched" | "dismissed";
          resolved_item_id?: string | null;
          resolved_by?: string | null;
          resolved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["purchase_request_unresolved_lines"]["Insert"]>;
        Relationships: [];
      };
      purchase_orders: {
        Row: {
          id: string;
          company_id: string | null;
          document_id: string | null;
          purchase_request_id: string | null;
          branch_id: string | null;
          po_no: string;
          supplier_id: string;
          order_date: string;
          expected_delivery_date: string | null;
          priority: "low" | "normal" | "urgent" | "critical";
          needed_by_date: string | null;
          urgency_reason: string | null;
          production_risk: boolean;
          status: PurchaseOrderStatus;
          approval_status: ApprovalStatus;
          remarks: string | null;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          updated_by: string | null;
          deleted_at: string | null;
          idempotency_key: string | null;
        };
        Insert: {
          id?: string;
          company_id?: string | null;
          document_id?: string | null;
          purchase_request_id?: string | null;
          branch_id?: string | null;
          po_no: string;
          supplier_id: string;
          order_date?: string;
          expected_delivery_date?: string | null;
          priority?: "low" | "normal" | "urgent" | "critical";
          needed_by_date?: string | null;
          urgency_reason?: string | null;
          production_risk?: boolean;
          status?: PurchaseOrderStatus;
          approval_status?: ApprovalStatus;
          remarks?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          updated_by?: string | null;
          deleted_at?: string | null;
          idempotency_key?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["purchase_orders"]["Insert"]>;
        Relationships: [];
      };
      purchase_order_lines: {
        Row: {
          id: string;
          purchase_order_id: string;
          item_id: string;
          qty_ordered: number;
          qty_received: number;
          qty_cancelled: number;
          uom: string;
          unit_price: number;
          line_total: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          purchase_order_id: string;
          item_id: string;
          qty_ordered: number;
          qty_received?: number;
          qty_cancelled?: number;
          uom: string;
          unit_price?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["purchase_order_lines"]["Insert"]>;
        Relationships: [];
      };
      goods_receivings: {
        Row: {
          id: string;
          company_id: string | null;
          document_id: string | null;
          purchase_order_id: string;
          grn_no: string;
          supplier_id: string;
          received_date: string;
          branch_id: string | null;
          status: GoodsReceivingStatus;
          received_by: string | null;
          remarks: string | null;
          posted_at: string | null;
          posted_by: string | null;
          cancelled_at: string | null;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          updated_by: string | null;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          company_id?: string | null;
          document_id?: string | null;
          purchase_order_id: string;
          grn_no: string;
          supplier_id: string;
          received_date?: string;
          branch_id?: string | null;
          status?: GoodsReceivingStatus;
          received_by?: string | null;
          remarks?: string | null;
          posted_at?: string | null;
          posted_by?: string | null;
          cancelled_at?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          updated_by?: string | null;
          deleted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["goods_receivings"]["Insert"]>;
        Relationships: [];
      };
      goods_receiving_lines: {
        Row: {
          id: string;
          goods_receiving_id: string;
          purchase_order_line_id: string;
          item_id: string;
          ordered_qty: number;
          previously_received_qty: number;
          pending_qty: number;
          received_qty: number;
          rejected_qty: number;
          returned_qty: number;
          uom: string;
          unit_cost: number;
          batch_no: string | null;
          expiry_date: string | null;
          remarks: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          goods_receiving_id: string;
          purchase_order_line_id: string;
          item_id: string;
          ordered_qty?: number;
          previously_received_qty?: number;
          pending_qty?: number;
          received_qty?: number;
          rejected_qty?: number;
          returned_qty?: number;
          uom: string;
          unit_cost?: number;
          batch_no?: string | null;
          expiry_date?: string | null;
          remarks?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["goods_receiving_lines"]["Insert"]>;
        Relationships: [];
      };
      purchase_returns: {
        Row: {
          id: string;
          company_id: string | null;
          document_id: string | null;
          purchase_return_no: string;
          goods_receiving_id: string;
          purchase_order_id: string;
          supplier_id: string;
          branch_id: string | null;
          return_date: string;
          status: PurchaseReturnStatus;
          reason: string | null;
          remarks: string | null;
          posted_at: string | null;
          posted_by: string | null;
          cancelled_at: string | null;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          updated_by: string | null;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          company_id?: string | null;
          document_id?: string | null;
          purchase_return_no: string;
          goods_receiving_id: string;
          purchase_order_id: string;
          supplier_id: string;
          branch_id?: string | null;
          return_date?: string;
          status?: PurchaseReturnStatus;
          reason?: string | null;
          remarks?: string | null;
          posted_at?: string | null;
          posted_by?: string | null;
          cancelled_at?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          updated_by?: string | null;
          deleted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["purchase_returns"]["Insert"]>;
        Relationships: [];
      };
      supplier_invoices: {
        Row: {
          id: string;
          company_id: string | null;
          document_id: string | null;
          invoice_no: string;
          supplier_invoice_no: string;
          supplier_id: string;
          purchase_order_id: string;
          goods_receiving_id: string;
          invoice_date: string;
          due_date: string | null;
          subtotal: number;
          tax_amount: number;
          total_amount: number;
          amount_paid: number;
          status: SupplierInvoiceStatus;
          payment_terms_days: number;
          approved_at: string | null;
          approved_by: string | null;
          voided_at: string | null;
          voided_by: string | null;
          void_reason: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          updated_by: string | null;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          company_id?: string | null;
          document_id?: string | null;
          invoice_no: string;
          supplier_invoice_no: string;
          supplier_id: string;
          purchase_order_id: string;
          goods_receiving_id: string;
          invoice_date?: string;
          due_date?: string | null;
          subtotal?: number;
          tax_amount?: number;
          total_amount: number;
          amount_paid?: number;
          status?: SupplierInvoiceStatus;
          payment_terms_days?: number;
          approved_at?: string | null;
          approved_by?: string | null;
          voided_at?: string | null;
          voided_by?: string | null;
          void_reason?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          updated_by?: string | null;
          deleted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["supplier_invoices"]["Insert"]>;
        Relationships: [];
      };
      supplier_invoice_payments: {
        Row: {
          id: string;
          company_id: string | null;
          supplier_invoice_id: string;
          payment_no: string;
          payment_date: string;
          amount: number;
          payment_method: string | null;
          reference_no: string | null;
          notes: string | null;
          created_at: string;
          created_by: string | null;
          idempotency_key: string | null;
        };
        Insert: {
          id?: string;
          company_id?: string | null;
          supplier_invoice_id: string;
          payment_no: string;
          payment_date?: string;
          amount: number;
          payment_method?: string | null;
          reference_no?: string | null;
          notes?: string | null;
          created_at?: string;
          created_by?: string | null;
          idempotency_key?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["supplier_invoice_payments"]["Insert"]>;
        Relationships: [];
      };
      supplier_invoice_lines: {
        Row: {
          id: string;
          supplier_invoice_id: string;
          goods_receiving_id: string;
          goods_receiving_line_id: string;
          purchase_order_id: string;
          purchase_order_line_id: string;
          item_id: string;
          uom: string;
          ordered_qty: number;
          received_qty: number;
          previously_invoiced_qty: number;
          invoice_qty: number;
          po_unit_price: number;
          invoice_unit_price: number;
          line_total: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          supplier_invoice_id: string;
          goods_receiving_id: string;
          goods_receiving_line_id: string;
          purchase_order_id: string;
          purchase_order_line_id: string;
          item_id: string;
          uom: string;
          ordered_qty: number;
          received_qty: number;
          previously_invoiced_qty?: number;
          invoice_qty: number;
          po_unit_price: number;
          invoice_unit_price: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["supplier_invoice_lines"]["Insert"]>;
        Relationships: [];
      };
      purchase_return_lines: {
        Row: {
          id: string;
          purchase_return_id: string;
          goods_receiving_line_id: string;
          purchase_order_line_id: string;
          item_id: string;
          received_qty: number;
          previously_returned_qty: number;
          return_qty: number;
          uom: string;
          unit_cost: number;
          line_total: number;
          reason: string | null;
          stock_transaction_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          purchase_return_id: string;
          goods_receiving_line_id: string;
          purchase_order_line_id: string;
          item_id: string;
          received_qty?: number;
          previously_returned_qty?: number;
          return_qty: number;
          uom: string;
          unit_cost?: number;
          reason?: string | null;
          stock_transaction_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["purchase_return_lines"]["Insert"]>;
        Relationships: [];
      };
      recipes: {
        Row: {
          id: string;
          company_id: string | null;
          document_id: string | null;
          recipe_no: string;
          product_id: string;
          version: number;
          yield_qty: number;
          yield_unit: string;
          status: RecipeStatus;
          approval_status: ApprovalStatus;
          effective_date: string;
          remark: string | null;
          remarks: string | null;
          submitted_at: string | null;
          approved_at: string | null;
          activated_at: string | null;
          rejected_at: string | null;
          archived_at: string | null;
          created_by: string | null;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          company_id?: string | null;
          document_id?: string | null;
          recipe_no: string;
          product_id: string;
          version?: number;
          yield_qty: number;
          yield_unit: string;
          status?: RecipeStatus;
          approval_status?: ApprovalStatus;
          effective_date?: string;
          remark?: string | null;
          remarks?: string | null;
          submitted_at?: string | null;
          approved_at?: string | null;
          activated_at?: string | null;
          rejected_at?: string | null;
          archived_at?: string | null;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["recipes"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "recipes_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      recipe_lines: {
        Row: {
          id: string;
          recipe_id: string;
          ingredient_item_id: string;
          qty_required: number;
          unit: string;
          recipe_uom: string;
          base_uom: string;
          conversion_factor: number;
          base_qty_required: number;
          wastage_percent: number;
          cost_per_unit: number;
          remarks: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          recipe_id: string;
          ingredient_item_id: string;
          qty_required: number;
          unit: string;
          recipe_uom: string;
          base_uom: string;
          conversion_factor?: number;
          base_qty_required: number;
          wastage_percent?: number;
          cost_per_unit?: number;
          remarks?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["recipe_lines"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "recipe_lines_recipe_id_fkey";
            columns: ["recipe_id"];
            isOneToOne: false;
            referencedRelation: "recipes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "recipe_lines_ingredient_item_id_fkey";
            columns: ["ingredient_item_id"];
            isOneToOne: false;
            referencedRelation: "items";
            referencedColumns: ["id"];
          },
        ];
      };
      recipe_cost_snapshots: {
        Row: {
          id: string;
          recipe_id: string;
          snapshot_no: number;
          total_ingredient_cost: number;
          wastage_adjusted_cost: number;
          cost_per_finished_unit: number;
          cost_per_pack: number | null;
          packaging_name: string | null;
          yield_qty: number;
          yield_uom: string;
          captured_at: string;
          captured_by: string | null;
          created_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          recipe_id: string;
          snapshot_no?: number;
          total_ingredient_cost?: number;
          wastage_adjusted_cost?: number;
          cost_per_finished_unit?: number;
          cost_per_pack?: number | null;
          packaging_name?: string | null;
          yield_qty?: number;
          yield_uom?: string;
          captured_at?: string;
          captured_by?: string | null;
          created_at?: string;
          created_by?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["recipe_cost_snapshots"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "recipe_cost_snapshots_recipe_id_fkey";
            columns: ["recipe_id"];
            isOneToOne: false;
            referencedRelation: "recipes";
            referencedColumns: ["id"];
          },
        ];
      };
      stock_transactions: {
        Row: {
          id: string;
          transaction_no: string;
          document_id: string | null;
          branch_id: string | null;
          item_id: string;
          transaction_type: StockTransactionType;
          transaction_date: string;
          quantity_in: number;
          quantity_out: number;
          unit_cost: number | null;
          total_cost: number | null;
          status: StockTransactionStatus;
          posted_at: string | null;
          posted_by: string | null;
          remarks: string | null;
          reference_type: string | null;
          reference_id: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          transaction_no?: string;
          document_id?: string | null;
          branch_id?: string | null;
          item_id: string;
          transaction_type: StockTransactionType;
          transaction_date?: string;
          quantity_in?: number;
          quantity_out?: number;
          unit_cost?: number | null;
          total_cost?: number | null;
          status?: StockTransactionStatus;
          posted_at?: string | null;
          posted_by?: string | null;
          remarks?: string | null;
          reference_type?: string | null;
          reference_id?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["stock_transactions"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "stock_transactions_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: false;
            referencedRelation: "items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stock_transactions_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "staffs";
            referencedColumns: ["id"];
          },
        ];
      };
      stock_transaction_lines: {
        Row: {
          id: string;
          stock_transaction_id: string;
          stock_entity_type: StockEntityType;
          item_id: string | null;
          product_id: string | null;
          branch_id: string | null;
          quantity_in: number;
          quantity_out: number;
          running_balance: number | null;
          unit_cost: number;
          total_cost: number;
          reference_type: string | null;
          reference_id: string | null;
          remarks: string | null;
          created_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          stock_transaction_id: string;
          stock_entity_type?: StockEntityType;
          item_id?: string | null;
          product_id?: string | null;
          branch_id?: string | null;
          quantity_in?: number;
          quantity_out?: number;
          running_balance?: number | null;
          unit_cost?: number;
          reference_type?: string | null;
          reference_id?: string | null;
          remarks?: string | null;
          created_at?: string;
          created_by?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["stock_transaction_lines"]["Insert"]>;
        Relationships: [];
      };
      stock_count_voids: {
        Row: { id: string; company_id: string; stock_count_id: string; movement_fingerprint: string; adjustment_line_count: number; reversed_quantity_in: number; reversed_quantity_out: number; reason: string; idempotency_key: string; voided_by: string; voided_at: string };
        Insert: { id?: string; company_id: string; stock_count_id: string; movement_fingerprint: string; adjustment_line_count: number; reversed_quantity_in?: number; reversed_quantity_out?: number; reason: string; idempotency_key: string; voided_by: string; voided_at?: string };
        Update: Partial<Database["public"]["Tables"]["stock_count_voids"]["Insert"]>;
        Relationships: [];
      };
      stock_counts: {
        Row: {
          id: string;
          company_id: string | null;
          document_id: string | null;
          count_no: string;
          count_date: string;
          branch_id: string | null;
          counted_by: string | null;
          status: StockCountStatus;
          tolerance_percent: number;
          remarks: string | null;
          submitted_at: string | null;
          reviewed_at: string | null;
          approved_at: string | null;
          posted_at: string | null;
          rejected_at: string | null;
          cancelled_at: string | null;
          posting_reference: string | null;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          updated_by: string | null;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          company_id?: string | null;
          document_id?: string | null;
          count_no: string;
          count_date?: string;
          branch_id?: string | null;
          counted_by?: string | null;
          status?: StockCountStatus;
          tolerance_percent?: number;
          remarks?: string | null;
          submitted_at?: string | null;
          reviewed_at?: string | null;
          approved_at?: string | null;
          posted_at?: string | null;
          rejected_at?: string | null;
          cancelled_at?: string | null;
          posting_reference?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          updated_by?: string | null;
          deleted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["stock_counts"]["Insert"]>;
        Relationships: [];
      };
      stock_count_lines: {
        Row: {
          id: string;
          stock_count_id: string;
          line_position: number;
          item_id: string;
          theoretical_qty: number;
          physical_qty: number;
          variance_qty: number;
          variance_percent: number;
          uom: string;
          remarks: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          stock_count_id: string;
          line_position?: number;
          item_id: string;
          theoretical_qty?: number;
          physical_qty?: number;
          uom: string;
          remarks?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["stock_count_lines"]["Insert"]>;
        Relationships: [];
      };
      document_line_revisions: {
        Row: {
          id: string; company_id: string; document_type: "purchase_request" | "stock_count" | "purchase_order";
          document_id: string; line_id: string | null; action: "update" | "replace" | "remove";
          before_snapshot: Json; after_snapshot: Json | null; reason: string;
          status: "pending" | "applied" | "rejected"; idempotency_key: string;
          requested_by: string; reviewed_by: string | null; resolved_at: string | null; created_at: string;
        };
        Insert: {
          id?: string; company_id: string; document_type: "purchase_request" | "stock_count" | "purchase_order";
          document_id: string; line_id?: string | null; action: "update" | "replace" | "remove";
          before_snapshot?: Json; after_snapshot?: Json | null; reason: string;
          status?: "pending" | "applied" | "rejected"; idempotency_key: string;
          requested_by: string; reviewed_by?: string | null; resolved_at?: string | null; created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["document_line_revisions"]["Insert"]>;
        Relationships: [];
      };
      stock_transfers: {
        Row: {
          id: string; company_id: string | null; document_id: string | null; transfer_no: string; transfer_date: string;
          from_branch_id: string | null; to_branch_id: string | null;
          status: StockOperationStatus; remarks: string | null; posted_at: string | null; created_at: string; updated_at: string;
          created_by: string | null; updated_by: string | null; deleted_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["stock_transfers"]["Row"]> & { transfer_no: string };
        Update: Partial<Database["public"]["Tables"]["stock_transfers"]["Insert"]>;
        Relationships: [];
      };
        stock_transfer_lines: {
          Row: {
            id: string; stock_transfer_id: string; item_id: string; quantity: number; received_quantity: number; uom: string; remarks: string | null; created_at: string; updated_at: string;
          };
        Insert: Partial<Database["public"]["Tables"]["stock_transfer_lines"]["Row"]> & { stock_transfer_id: string; item_id: string; quantity: number; uom: string };
        Update: Partial<Database["public"]["Tables"]["stock_transfer_lines"]["Insert"]>;
          Relationships: [];
        };
        stock_transfer_reservations: {
          Row: {
            id: string; company_id: string; stock_transfer_id: string; stock_transfer_line_id: string; item_id: string; from_branch_id: string;
            reserved_quantity: number; received_quantity: number; status: "active" | "consumed" | "released"; reserved_at: string;
            released_at: string | null; created_by: string | null; updated_at: string;
          };
          Insert: Partial<Database["public"]["Tables"]["stock_transfer_reservations"]["Row"]> & { company_id: string; stock_transfer_id: string; stock_transfer_line_id: string; item_id: string; from_branch_id: string; reserved_quantity: number };
          Update: Partial<Database["public"]["Tables"]["stock_transfer_reservations"]["Insert"]>;
          Relationships: [];
        };
        stock_transfer_receipts: {
          Row: {
            id: string; company_id: string; stock_transfer_id: string; idempotency_key: string; received_by: string; received_at: string; status: "posted"; created_at: string;
          };
          Insert: Partial<Database["public"]["Tables"]["stock_transfer_receipts"]["Row"]> & { company_id: string; stock_transfer_id: string; idempotency_key: string; received_by: string };
          Update: Partial<Database["public"]["Tables"]["stock_transfer_receipts"]["Insert"]>;
          Relationships: [];
        };
        stock_transfer_receipt_lines: {
          Row: {
            id: string; receipt_id: string; stock_transfer_line_id: string; received_quantity: number; uom: string; source_transaction_id: string | null; destination_transaction_id: string | null; created_at: string;
          };
          Insert: Partial<Database["public"]["Tables"]["stock_transfer_receipt_lines"]["Row"]> & { receipt_id: string; stock_transfer_line_id: string; received_quantity: number; uom: string };
          Update: Partial<Database["public"]["Tables"]["stock_transfer_receipt_lines"]["Insert"]>;
          Relationships: [];
        };
      stock_wastage: {
        Row: {
          id: string; company_id: string | null; document_id: string | null; wastage_no: string; wastage_date: string; branch_id: string | null;
          reason: StockWastageReason; status: StockOperationStatus; remarks: string | null; posted_at: string | null; created_at: string; updated_at: string;
          created_by: string | null; updated_by: string | null; deleted_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["stock_wastage"]["Row"]> & { wastage_no: string; reason: StockWastageReason };
        Update: Partial<Database["public"]["Tables"]["stock_wastage"]["Insert"]>;
        Relationships: [];
      };
      stock_wastage_lines: {
        Row: {
          id: string; stock_wastage_id: string; item_id: string; quantity: number; uom: string; reason: StockWastageReason;
          batch_no: string | null; expiry_date: string | null; remarks: string | null; created_at: string; updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["stock_wastage_lines"]["Row"]> & { stock_wastage_id: string; item_id: string; quantity: number; uom: string; reason: StockWastageReason };
        Update: Partial<Database["public"]["Tables"]["stock_wastage_lines"]["Insert"]>;
        Relationships: [];
      };
      stock_balances_summary: {
        Row: {
          item_id: string;
          branch_id: string;
          company_id: string;
          item_code: string;
          autocount_code: string | null;
          item_name: string;
          branch_name: string;
          category: string;
          purchase_unit: string;
          base_unit: string;
          conversion_to_base_unit: number;
          supplier_id: string | null;
          supplier_name: string | null;
          cost: number;
          safety_stock: number;
          lead_time_days: number;
          moq: number;
          status: ItemStatus;
          total_quantity_in: number;
          total_quantity_out: number;
          current_stock: number;
          current_qty: number;
          average_cost: number;
          inventory_value: number;
          last_movement: string | null;
          is_low_stock: boolean;
          shortage_quantity: number;
          updated_at: string;
        };
        Insert: {
          item_id: string;
          branch_id: string;
          company_id: string;
          item_code: string;
          autocount_code?: string | null;
          item_name: string;
          branch_name: string;
          category?: string;
          purchase_unit?: string;
          base_unit?: string;
          conversion_to_base_unit?: number;
          supplier_id?: string | null;
          supplier_name?: string | null;
          cost?: number;
          safety_stock?: number;
          lead_time_days?: number;
          moq?: number;
          status?: ItemStatus;
          total_quantity_in?: number;
          total_quantity_out?: number;
          current_stock?: number;
          current_qty?: number;
          average_cost?: number;
          inventory_value?: number;
          last_movement?: string | null;
          is_low_stock?: boolean;
          shortage_quantity?: number;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["stock_balances_summary"]["Insert"]>;
        Relationships: [];
      };
      inventory_daily_summary: {
        Row: {
          company_id: string;
          branch_id: string;
          item_id: string;
          transaction_date: string;
          transaction_type: string;
          quantity_in: number;
          quantity_out: number;
          movement_count: number;
          updated_at: string;
        };
        Insert: {
          company_id: string;
          branch_id: string;
          item_id: string;
          transaction_date: string;
          transaction_type: string;
          quantity_in?: number;
          quantity_out?: number;
          movement_count?: number;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["inventory_daily_summary"]["Insert"]>;
        Relationships: [];
      };
    };
      branch_stock_count_items: TableDefinition<{
        branch_id: string; branch_note: string | null; company_id: string; created_at: string; created_by: string | null;
        id: string; item_id: string; last_action: string | null; last_action_at: string | null; last_action_by: string | null;
        last_action_stock_count_id: string | null; last_physical_qty: number | null; pending_stock_count_id: string | null;
        restored_at: string | null; restored_by: string | null; retired_at: string | null; retired_by: string | null;
        retired_stock_count_id: string | null; retirement_note: string | null; retirement_reason: string | null;
        status: string; updated_at: string; updated_by: string | null;
      }>;
      item_correction_suggestions: TableDefinition<{
        branch_id: string; company_id: string; created_at: string; id: string; item_id: string; resolved_at: string | null;
        status: string; stock_count_id: string | null; suggested_by: string; suggestion: string;
      }>;
      permanent_deletion_tombstones: TableDefinition<{
        actor_id: string | null; actor_name: string | null; company_id: string | null; deleted_at: string; deletion_reason: string;
        dependency_summary: Json; display_label: string; id: string; record_id: string; record_number: string | null;
        record_type: string; sanitized_snapshot: Json;
      }>;
      production_job_ingredient_lines: TableDefinition<{
        actual_qty: number | null; created_at: string; id: string; item_code: string | null; item_id: string;
        item_name: string | null; line_cost: number | null; production_job_id: string; remarks: string | null;
        required_qty: number; stock_available_qty: number | null; unit_cost: number | null; uom: string | null;
        variance_qty: number | null;
      }>;
      production_job_output_lines: TableDefinition<{
        actual_qty: number | null; created_at: string; id: string; item_id: string | null; line_cost: number | null;
        output_code: string | null; output_name: string | null; planned_qty: number; product_id: string | null;
        production_job_id: string; remarks: string | null; unit_cost: number | null; uom: string | null;
      }>;
      production_jobs: TableDefinition<{
        actual_output_qty: number | null; branch_id: string; cancelled_at: string | null; cancelled_by: string | null;
        company_id: string | null; created_at: string; created_by: string | null; deleted_at: string | null;
        document_id: string | null; id: string; idempotency_key: string | null; output_item_id: string | null;
        output_uom: string | null; planned_output_qty: number; posted_at: string | null; posted_by: string | null;
        priority: string | null; product_id: string | null; production_date: string; production_job_no: string;
        recipe_id: string; rejected_at: string | null; rejected_by: string | null; remarks: string | null;
        status: string; stock_transaction_id: string | null; updated_at: string; updated_by: string | null;
      }>;
      purchase_request_stock_holds: TableDefinition<{
        branch_id: string; created_at: string; id: string; item_id: string; purchase_request_id: string;
        quantity_inventory: number; status: string;
      }>;
      stock_count_item_retirements: TableDefinition<{
        actual_qty: number; applied_at: string | null; branch_id: string; company_id: string; created_at: string;
        id: string; item_id: string; note: string; reason: string; requested_by: string; status: string;
        stock_count_id: string; stock_count_line_id: string; updated_at: string;
      }>;
      stock_count_reconciliations: TableDefinition<{
        branch_id: string; company_id: string; final_variance_qty: number; id: string; item_id: string;
        movement_qty: number; physical_qty: number; posting_balance: number; reconciled_at: string; reconciled_by: string;
        snapshot_balance: number; stock_count_id: string; stock_count_line_id: string;
      }>;
      supplier_identity_reconciliation_audit: TableDefinition<{
        action: string; canonical_supplier_id: string; company_id: string; created_at: string; id: string;
        merged_supplier_id: string; relation_before: Json; relation_id: string; relation_type: string;
      }>;
      supplier_item_merge_audit: TableDefinition<{
        canonical_before: Json; canonical_supplier_item_id: string; company_id: string; id: string; merge_reason: string;
        merged_at: string; merged_before: Json; merged_supplier_item_id: string;
      }>;
      supplier_merge_audit: TableDefinition<{
        canonical_before: Json; canonical_supplier_id: string; company_id: string; id: string; merge_reason: string;
        merged_at: string; merged_before: Json; merged_supplier_id: string;
      }>;
      supplier_merge_line_audit: TableDefinition<{
        canonical_supplier_id: string; company_id: string; created_at: string; id: string; original_uom: string;
        purchase_request_line_id: string; resolution: string; source_supplier_id: string;
      }>;
      supplier_uom_conversion_audit: TableDefinition<{
        after_conversion: number; base_uom: string; before_conversion: number | null; changed_at: string;
        changed_by: string | null; company_id: string; goods_receiving_id: string | null;
        goods_receiving_line_id: string | null; id: string; item_id: string; purchase_uom: string; source: string;
        supplier_id: string;
      }>;
      user_preferences: TableDefinition<{
        company_id: string | null; created_at: string; id: string; preference_key: string; preference_value: Json;
        updated_at: string; user_id: string | null;
      }>;
    Views: {
      stock_balances_view: {
        Row: {
          item_id: string;
          item_code: string;
          autocount_code: string | null;
          item_name: string;
          category: string;
          purchase_unit: string;
          base_unit: string;
          conversion_to_base_unit: number;
          supplier_id: string | null;
          supplier_name: string | null;
          cost: number;
          safety_stock: number;
          lead_time_days: number;
          moq: number;
          status: ItemStatus;
          branch_id: string | null;
          branch_name: string | null;
          total_quantity_in: number;
          total_quantity_out: number;
          current_stock: number;
          current_qty: number;
          average_cost: number;
          inventory_value: number;
          last_movement: string | null;
          is_low_stock: boolean;
          shortage_quantity: number;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      low_stock_items: {
        Row: {
          item_id: string;
          item_code: string;
          item_name: string;
          category: string;
          base_unit: string;
          supplier_id: string | null;
          supplier_name: string | null;
          current_stock: number;
          safety_stock: number;
          shortage_quantity: number;
          moq: number;
          lead_time_days: number;
          cost: number;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      stock_counts_list_view: {
        Row: {
          id: string;
          company_id: string | null;
          document_id: string | null;
          count_no: string;
          count_date: string;
          branch_id: string | null;
          counted_by: string | null;
          status: StockCountStatus;
          tolerance_percent: number;
          remarks: string | null;
          submitted_at: string | null;
          reviewed_at: string | null;
          approved_at: string | null;
          posted_at: string | null;
          rejected_at: string | null;
          cancelled_at: string | null;
          posting_reference: string | null;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          updated_by: string | null;
          deleted_at: string | null;
          branch_name: string | null;
          counted_by_name: string | null;
          line_count: number;
          high_variance_count: number;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      stock_ledger_view: {
        Row: {
          stock_transaction_id: string;
          transaction_no: string;
          transaction_date: string;
          transaction_type: StockTransactionType;
          status: StockTransactionStatus;
          document_id: string | null;
          reference_type: string | null;
          reference_id: string | null;
          created_by: string | null;
          posted_at: string | null;
          stock_transaction_line_id: string | null;
          item_id: string;
          item_code: string;
          item_name: string;
          base_unit: string;
          branch_id: string | null;
          branch_name: string | null;
          quantity_in: number;
          quantity_out: number;
          unit_cost: number;
          total_cost: number;
          running_balance: number;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      inventory_valuation_view: {
        Row: {
          item_id: string;
          item_code: string;
          item_name: string;
          base_unit: string;
          branch_id: string | null;
          branch_name: string | null;
          total_quantity_in: number;
          total_quantity_out: number;
          current_qty: number;
          average_cost: number;
          inventory_value: number;
          last_movement: string | null;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
    };
    Functions: {
      preview_stock_count_void: { Args: { p_stock_count_id: string }; Returns: Json };
      void_stock_count_atomic: { Args: { p_stock_count_id: string; p_reason: string; p_expected_fingerprint: string; p_idempotency_key: string }; Returns: Json };
      record_system_incident: {
        Args: { p_fingerprint: string; p_module: string; p_safe_code: string; p_safe_message: string; p_route?: string | null; p_branch_id?: string | null; p_severity?: string; p_operation_id?: string | null; p_event_type?: string; p_recommended_action?: string | null };
        Returns: string;
      };
      acknowledge_system_incident: {
        Args: { p_incident_id: string };
        Returns: undefined;
      };
      revise_purchase_request_line: {
        Args: {
          target_purchase_request_id: string;
          target_line_id: string;
          revision_action: "update" | "replace" | "remove";
          replacement_item_id?: string | null;
          replacement_qty?: number | null;
          replacement_uom?: string | null;
          replacement_supplier_id?: string | null;
          replacement_unit_cost?: number | null;
          revision_reason: string;
          request_idempotency_key: string;
          expected_line_updated_at: string;
        };
        Returns: Json;
      };
      revise_stock_count_line: {
        Args: {
          target_stock_count_id: string;
          target_line_id: string;
          revision_action: "update" | "replace" | "remove";
          replacement_item_id?: string | null;
          replacement_physical_qty?: number | null;
          replacement_uom?: string | null;
          revision_reason: string;
          request_idempotency_key: string;
        };
        Returns: Json;
      };
      review_stock_count_line_revision: {
        Args: { target_revision_id: string; decision: "approve" | "reject" };
        Returns: Json;
      };
      get_dashboard_core_snapshot: {
        Args: { p_today?: string };
        Returns: Json;
      };
      get_stock_card_bounded: {
        Args: {
          p_from: string;
          p_to: string;
          p_item_id?: string | null;
          p_branch_id?: string | null;
          p_transaction_type?: string | null;
          p_direction?: string | null;
          p_search?: string | null;
          p_source?: string | null;
        };
        Returns: Database["public"]["Views"]["stock_ledger_view"]["Row"][];
      };
      get_stock_ledger_bounded_page: {
        Args: {
          p_from: string;
          p_to: string;
          p_item_id?: string | null;
          p_branch_id?: string | null;
          p_transaction_type?: string | null;
          p_direction?: string | null;
          p_search?: string | null;
          p_source?: string | null;
          p_sort?: string | null;
          p_dir?: string | null;
          p_offset?: number | null;
          p_limit?: number | null;
        };
        Returns: (Database["public"]["Views"]["stock_ledger_view"]["Row"] & { total_count: number })[];
      };
      get_goods_receiving_summary: {
        Args: Record<string, never>;
        Returns: Json;
      };
      current_user_role: {
        Args: Record<string, never>;
        Returns: UserRole;
      };
      has_role: {
        Args: { allowed_roles: string[] };
        Returns: boolean;
      };
      has_permission: {
        Args: { permission: string };
        Returns: boolean;
      };
      has_any_permission: {
        Args: { permission_codes: string[] };
        Returns: boolean;
      };
      get_allowed_permissions: {
        Args: { permission_codes: string[] };
        Returns: string[];
      };
      set_staff_permission_overrides: {
        Args: { target_staff_id: string; overrides: Json };
        Returns: void;
      };
      replace_staff_access_atomic: {
        Args: { p_staff_id: string; p_role_id: string; p_default_branch_id: string; p_accessible_branch_ids?: string[]; p_status?: Database["public"]["Enums"]["record_status"] | null; p_staff_code?: string | null; p_full_name?: string | null; p_email?: string | null; p_phone?: string | null };
        Returns: Json;
      };
      set_staff_status_atomic: { Args: { p_staff_id: string; p_status: Database["public"]["Enums"]["record_status"] }; Returns: void; };
      repair_staff_auth_link: {
        Args: { target_staff_id: string; target_auth_user_id: string; normalized_email: string };
        Returns: string;
      };
      set_role_permissions: {
        Args: { target_role_id: string; permission_ids: string[] };
        Returns: void;
      };
      can_access_purchase_request: {
        Args: { target_company_id: string | null; target_branch_id: string | null; target_requested_by: string | null };
        Returns: boolean;
      };
      link_purchase_request_document: {
        Args: { target_purchase_request_id: string; target_document_id: string };
        Returns: void;
      };
      transition_purchase_request: {
        Args: { target_purchase_request_id: string; transition_action: string; transition_remarks?: string | null };
        Returns: Json;
      };
      transition_purchase_order_atomic: {
        Args: { p_purchase_order_id: string; p_action: string };
        Returns: Json;
      };
      cancel_purchase_request_atomic: {
        Args: { target_purchase_request_id: string };
        Returns: Json;
      };
      cancel_purchase_order_atomic: {
        Args: { p_purchase_order_id: string };
        Returns: Json;
      };
      create_purchase_request_atomic: {
        Args: { p_payload: Json };
        Returns: Json;
      };
      create_purchase_order_atomic: {
        Args: { p_payload: Json };
        Returns: Json;
      };
      create_stock_transfer_atomic: {
        Args: { p_payload: Json };
        Returns: Json;
      };
      create_stock_count_atomic: {
        Args: { p_payload: Json };
        Returns: Json;
      };
      update_stock_count_draft_atomic: {
        Args: { p_stock_count_id: string; p_payload: Json };
        Returns: Json;
      };
      cancel_stock_count_atomic: {
        Args: { p_stock_count_id: string };
        Returns: Json;
      };
      delete_stock_count_draft_atomic: {
        Args: { p_stock_count_id: string };
        Returns: Json;
      };
      create_stock_wastage_atomic: {
        Args: { p_payload: Json };
        Returns: Json;
      };
      create_goods_receiving_atomic: {
        Args: { p_payload: Json };
        Returns: Json;
      };
      create_production_job_atomic: {
        Args: { p_payload: Json };
        Returns: Json;
      };
      create_purchase_return_atomic: {
        Args: { p_payload: Json };
        Returns: Json;
      };
      cancel_goods_receiving_atomic: {
        Args: { p_goods_receiving_id: string };
        Returns: Json;
      };
      cancel_purchase_return_atomic: {
        Args: { p_purchase_return_id: string };
        Returns: Json;
      };
      transition_production_job_atomic: {
        Args: { p_job_id: string; p_action: string; p_remarks?: string | null };
        Returns: Json;
      };
      transition_document_atomic: {
        Args: { p_document_id: string; p_action: string; p_remarks?: string | null };
        Returns: Json;
      };
      update_draft_purchase_request: {
        Args: {
          target_purchase_request_id: string;
          expected_updated_at: string;
          submitted_branch_id: string;
          request_date_value: string;
          required_date_value: string | null;
          priority_value: string;
          needed_by_date_value: string | null;
          urgency_reason_value: string | null;
          production_risk_value: boolean;
          remarks_value: string | null;
          lines_value: Json;
        };
        Returns: Json;
      };
      can_access_inventory_branch: {
        Args: { target_company_id: string; target_branch_id: string };
        Returns: boolean;
      };
      get_inventory_daily_movement_summary: {
        Args: { p_period?: string };
        Returns: {
          transaction_date: string;
          inbound_entries: number;
          outbound_entries: number;
          movement_entries: number;
        }[];
      };
      resolve_purchase_request_unresolved_line: {
        Args: { target_purchase_request_id: string; target_unresolved_line_id: string; target_item_id: string };
        Returns: Json;
      };
      get_stock_count_variance_insight: {
        Args: { p_branch_id?: string | null };
        Returns: {
          row_kind: string;
          row_key: string;
          row_label: string;
          record_date: string | null;
          entity_id: string | null;
          high_variance_count: number;
          shortage_count: number;
          overage_count: number;
          latest_count_id: string | null;
          latest_count_no: string | null;
          latest_count_date: string | null;
          latest_variance_percent: number | null;
          latest_variance_qty: number | null;
          latest_uom: string | null;
          rank_order: number;
        }[];
      };
      get_inventory_dashboard_summary: {
        Args: { p_period?: string };
        Returns: Json;
      };
      get_items_workspace: {
        Args: {
          p_search?: string | null;
          p_status?: string | null;
          p_category?: string | null;
          p_supplier_id?: string | null;
          p_stock_control?: string | null;
          p_low_stock?: string | null;
          p_sort?: string;
          p_direction?: string;
          p_page?: number;
          p_page_size?: number;
        };
        Returns: Json;
      };
      post_opening_stock: {
        Args: {
          p_transaction_no: string;
          p_branch_id: string;
          p_item_id: string;
          p_transaction_date: string;
          p_quantity: number;
          p_unit_cost: number;
          p_remarks: string;
        };
        Returns: string;
      };
      post_opening_stock_batch: {
        Args: { p_rows: Json };
        Returns: number;
      };
      post_goods_receiving_atomic: {
        Args: { p_goods_receiving_id: string; p_do_exception_reason?: string | null };
        Returns: Json;
      };
      post_purchase_return_atomic: {
        Args: { p_purchase_return_id: string };
        Returns: Json;
      };
      approve_stock_count_atomic: {
        Args: { p_stock_count_id: string };
        Returns: Json;
      };
      post_stock_count_atomic: {
        Args: { p_stock_count_id: string };
        Returns: Json;
      };
      post_manual_inventory_movement: {
        Args: {
          p_transaction_no: string;
          p_branch_id: string;
          p_item_id: string;
          p_transaction_type: StockTransactionType;
          p_transaction_date: string;
          p_quantity_in: number;
          p_quantity_out: number;
          p_unit_cost: number;
          p_remarks: string | null;
        };
        Returns: string;
      };
        dispatch_stock_transfer_atomic: { Args: { p_transfer_id: string }; Returns: Json };
        receive_stock_transfer_atomic: { Args: { p_transfer_id: string; p_payload: Json }; Returns: Json };
      post_stock_transfer_atomic: { Args: { p_transfer_id: string }; Returns: Json };
      post_stock_wastage_atomic: { Args: { p_wastage_id: string }; Returns: Json };
      post_production_job_atomic: { Args: { p_job_id: string }; Returns: Json };
      transition_stock_transfer_terminal_atomic: {
        Args: { p_transfer_id: string; p_action: string };
        Returns: Json;
      };
      transition_stock_wastage_terminal_atomic: {
        Args: { p_wastage_id: string; p_action: string };
        Returns: Json;
      };
      save_branch_supplier_item_mappings: {
        Args: { p_rows: Json; p_mode?: "create" | "update" | "upsert" };
        Returns: Json;
      };
      create_operational_item: {
        Args: { p_item: Json; p_supplier?: Json | null; p_branch_ids?: string[]; p_preferred?: boolean };
        Returns: Json;
      };
      apply_autocount_import_job: {
        Args: { p_job_id: string };
        Returns: Json;
      };
      convert_purchase_request_to_purchase_order: {
        Args: { target_purchase_request_id: string; target_po_no: string };
        Returns: Array<{
          purchase_order_id: string;
          purchase_order_no: string;
          purchase_request_no: string;
          already_existed: boolean;
        }>;
      };
      save_supplier_invoice_draft: {
        Args: {
          p_invoice_id: string | null;
          p_invoice_no: string;
          p_supplier_invoice_no: string;
          p_supplier_id: string;
          p_invoice_date: string;
          p_due_date: string | null;
          p_payment_terms_days: number;
          p_tax_amount: number;
          p_notes: string | null;
          p_lines: Json;
        };
        Returns: string;
      };
      approve_supplier_invoice: { Args: { p_invoice_id: string }; Returns: void };
      record_supplier_invoice_payment: {
        Args: {
          p_invoice_id: string;
          p_payment_no: string;
          p_payment_date: string;
          p_amount: number;
          p_payment_method: string | null;
          p_reference_no: string | null;
          p_notes: string | null;
          p_idempotency_key: string;
        };
        Returns: string;
      };
      void_supplier_invoice: { Args: { p_invoice_id: string; p_reason: string }; Returns: void };
      get_ap_aging_report: {
        Args: {
          p_search?: string | null;
          p_supplier_id?: string | null;
          p_bucket?: string | null;
          p_status?: string | null;
          p_due_from?: string | null;
          p_due_to?: string | null;
          p_overdue_only?: boolean;
          p_page?: number;
          p_page_size?: number;
        };
        Returns: Json;
      };
      can_access_outlet_daily_branch: {
        Args: { target_branch_id: string };
        Returns: boolean;
      };
      replace_branch_supply_routes: {
        Args: { p_branch_id: string; p_related_branch_ids?: string[] };
        Returns: void;
      };
      save_outlet_daily_record: {
        Args: {
          p_record_id: string | null;
          p_branch_id: string;
          p_record_date: string;
          p_notes: string | null;
          p_lines: Json;
          p_target_status: string;
        };
        Returns: string;
      };
      transition_outlet_daily_record: {
        Args: { p_record_id: string; p_action: string; p_reason?: string | null };
        Returns: void;
      };
      has_admin_staff_assignment: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      bootstrap_first_admin: {
        Args: { p_first_owner_user_id: string };
        Returns: void;
      };
      preview_phase_one_hard_delete: {
        Args: { record_type: string; record_id: string };
        Returns: Json;
      };
      hard_delete_phase_one: {
        Args: { record_type: string; record_id: string; confirmation: string };
        Returns: Json;
      };
    };
    Enums: {
      item_status: ItemStatus;
      supplier_status: SupplierStatus;
      branch_type: BranchType;
      staff_access_level: StaffAccessLevel;
      reset_frequency: ResetFrequency;
      stock_entity_type: StockEntityType;
      record_status: RecordStatus;
      stock_transaction_type: StockTransactionType;
      stock_transaction_status: StockTransactionStatus;
      stock_count_status: StockCountStatus;
      stock_operation_status: StockOperationStatus;
      stock_wastage_reason: StockWastageReason;
      outlet_daily_record_status: OutletDailyRecordStatus;
      outlet_daily_wastage_reason: OutletDailyWastageReason;
      recipe_status: RecipeStatus;
      document_status: DocumentStatus;
      approval_status: ApprovalStatus;
      purchase_request_status: PurchaseRequestStatus;
      purchase_order_status: PurchaseOrderStatus;
      goods_receiving_status: GoodsReceivingStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};
