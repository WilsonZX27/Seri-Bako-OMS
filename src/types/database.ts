export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type UserRole = "admin" | "finance" | "purchasing" | "kitchen" | "viewer";
export type ItemStatus = "active" | "inactive";
export type SupplierStatus = "active" | "inactive";
export type RecordStatus = "active" | "inactive" | "archived";
export type StaffStatus = RecordStatus | "invited" | "disabled";
export type LocationStatus = RecordStatus;
export type BranchType = "central_kitchen" | "outlet" | "event_booth" | "office" | "other";
export type StaffAccessLevel = "full" | "manage" | "read_only";
export type ResetFrequency = "never" | "yearly" | "monthly" | "daily";
export type BarcodeType = "ean13" | "upc" | "qr" | "internal" | "supplier" | "packaging" | "other";
export type StockEntityType = "item" | "product";
export type DocumentStatus = "draft" | "submitted" | "pending_approval" | "approved" | "rejected" | "posted" | "cancelled" | "closed";
export type ApprovalStatus = "not_required" | "draft" | "pending" | "approved" | "rejected" | "cancelled";
export type PurchaseRequestStatus = "draft" | "submitted" | "admin_review" | "purchasing_review" | "pending_approval" | "approved" | "rejected" | "converted" | "cancelled";
export type PurchaseOrderStatus = "draft" | "pending_approval" | "approved" | "sent" | "partial_received" | "received" | "cancelled" | "closed";
export type GoodsReceivingStatus = "draft" | "posted" | "cancelled";
export type StockTransactionStatus = "draft" | "posted" | "cancelled";
export type StockCountStatus = "draft" | "submitted" | "reviewed" | "approved" | "posted" | "rejected" | "cancelled";
export type StockOperationStatus = "draft" | "submitted" | "approved" | "posted" | "rejected" | "cancelled";
export type StockWastageReason = "expired" | "damaged" | "spoiled" | "production_loss" | "missing" | "staff_meal" | "sampling" | "supplier_claim" | "other";
export type RecipeStatus = "draft" | "pending_approval" | "approved" | "active" | "rejected" | "archived";
export type LocationType =
  | "dry_store"
  | "chiller"
  | "freezer"
  | "packaging_area"
  | "production_floor"
  | "dispatch_area"
  | "receiving_area"
  | "finished_goods_store"
  | "other";
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
          default_location_id: string | null;
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
          default_location_id?: string | null;
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
          default_branch_id: string | null;
          status: StaffStatus;
          invited_at: string | null;
          invited_by: string | null;
          accepted_at: string | null;
          last_login_at: string | null;
          invite_email: string | null;
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
          default_branch_id?: string | null;
          status?: StaffStatus;
          invited_at?: string | null;
          invited_by?: string | null;
          accepted_at?: string | null;
          last_login_at?: string | null;
          invite_email?: string | null;
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
      staff_locations: {
        Row: {
          id: string;
          staff_id: string;
          location_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          staff_id: string;
          location_id: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["staff_locations"]["Insert"]>;
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
      barcode_mappings: {
        Row: {
          id: string;
          company_id: string;
          stock_entity_type: StockEntityType;
          item_id: string | null;
          product_id: string | null;
          barcode_value: string;
          barcode_type: BarcodeType;
          is_primary: boolean;
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
          stock_entity_type: StockEntityType;
          item_id?: string | null;
          product_id?: string | null;
          barcode_value: string;
          barcode_type?: BarcodeType;
          is_primary?: boolean;
          status?: RecordStatus;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          updated_by?: string | null;
          deleted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["barcode_mappings"]["Insert"]>;
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
          uploaded_at: string;
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
          uploaded_at?: string;
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
      suppliers: {
        Row: {
          id: string;
          supplier_code: string | null;
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
          supplier_code?: string | null;
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
      locations: {
        Row: {
          id: string;
          company_id: string | null;
          branch_id: string | null;
          location_code: string;
          location_name: string;
          location_type: LocationType;
          status: LocationStatus;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          updated_by: string | null;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          company_id?: string | null;
          branch_id?: string | null;
          location_code: string;
          location_name: string;
          location_type?: LocationType;
          status?: LocationStatus;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          updated_by?: string | null;
          deleted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["locations"]["Insert"]>;
        Relationships: [];
      };
      items: {
        Row: {
          id: string;
          item_code: string;
          autocount_code: string | null;
          item_name: string;
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
          barcode: string | null;
          qr_code: string | null;
          supplier_barcode: string | null;
          internal_barcode: string | null;
          barcode_type: BarcodeType | null;
          barcode_image_url: string | null;
          item_image_url: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          item_code: string;
          autocount_code?: string | null;
          item_name: string;
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
          barcode?: string | null;
          qr_code?: string | null;
          supplier_barcode?: string | null;
          internal_barcode?: string | null;
          barcode_type?: BarcodeType | null;
          barcode_image_url?: string | null;
          item_image_url?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["items"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "items_supplier_id_fkey";
            columns: ["supplier_id"];
            isOneToOne: false;
            referencedRelation: "suppliers";
            referencedColumns: ["id"];
          },
        ];
      };
      products: {
        Row: {
          id: string;
          product_code: string;
          product_name: string;
          category: string;
          selling_unit: string;
          status: ItemStatus;
          barcode: string | null;
          qr_code: string | null;
          internal_barcode: string | null;
          barcode_type: BarcodeType | null;
          barcode_image_url: string | null;
          product_image_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          product_code: string;
          product_name: string;
          category: string;
          selling_unit: string;
          status?: ItemStatus;
          barcode?: string | null;
          qr_code?: string | null;
          internal_barcode?: string | null;
          barcode_type?: BarcodeType | null;
          barcode_image_url?: string | null;
          product_image_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["products"]["Insert"]>;
        Relationships: [];
      };
      supplier_items: {
        Row: {
          id: string;
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
      uom_conversions: {
        Row: {
          id: string;
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
          requested_by: string | null;
          request_date: string;
          required_date: string | null;
          priority: "low" | "normal" | "urgent" | "critical";
          needed_by_date: string | null;
          urgency_reason: string | null;
          production_risk: boolean;
          branch_id: string | null;
          location_id: string | null;
          status: PurchaseRequestStatus;
          remarks: string | null;
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
          request_no: string;
          requested_by?: string | null;
          request_date?: string;
          required_date?: string | null;
          priority?: "low" | "normal" | "urgent" | "critical";
          needed_by_date?: string | null;
          urgency_reason?: string | null;
          production_risk?: boolean;
          branch_id?: string | null;
          location_id?: string | null;
          status?: PurchaseRequestStatus;
          remarks?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          updated_by?: string | null;
          deleted_at?: string | null;
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
      purchase_orders: {
        Row: {
          id: string;
          company_id: string | null;
          document_id: string | null;
          purchase_request_id: string | null;
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
        };
        Insert: {
          id?: string;
          company_id?: string | null;
          document_id?: string | null;
          purchase_request_id?: string | null;
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
          location_id: string;
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
          location_id: string;
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
          location_id: string;
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
          from_location_id: string | null;
          to_location_id: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          transaction_no?: string;
          document_id?: string | null;
          branch_id?: string | null;
          item_id: string;
          location_id: string;
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
          from_location_id?: string | null;
          to_location_id?: string | null;
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
            foreignKeyName: "stock_transactions_location_id_fkey";
            columns: ["location_id"];
            isOneToOne: false;
            referencedRelation: "locations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stock_transactions_from_location_id_fkey";
            columns: ["from_location_id"];
            isOneToOne: false;
            referencedRelation: "locations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stock_transactions_to_location_id_fkey";
            columns: ["to_location_id"];
            isOneToOne: false;
            referencedRelation: "locations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stock_transactions_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
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
          location_id: string;
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
          location_id: string;
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
      stock_counts: {
        Row: {
          id: string;
          company_id: string | null;
          document_id: string | null;
          count_no: string;
          count_date: string;
          branch_id: string | null;
          location_id: string;
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
          location_id: string;
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
          item_id: string;
          barcode: string | null;
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
          item_id: string;
          barcode?: string | null;
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
      stock_transfers: {
        Row: {
          id: string; company_id: string | null; document_id: string | null; transfer_no: string; transfer_date: string;
          from_branch_id: string | null; from_location_id: string; to_branch_id: string | null; to_location_id: string;
          status: StockOperationStatus; remarks: string | null; posted_at: string | null; created_at: string; updated_at: string;
          created_by: string | null; updated_by: string | null; deleted_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["stock_transfers"]["Row"]> & { transfer_no: string; from_location_id: string; to_location_id: string };
        Update: Partial<Database["public"]["Tables"]["stock_transfers"]["Insert"]>;
        Relationships: [];
      };
      stock_transfer_lines: {
        Row: {
          id: string; stock_transfer_id: string; item_id: string; barcode: string | null; quantity: number; uom: string; remarks: string | null; created_at: string; updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["stock_transfer_lines"]["Row"]> & { stock_transfer_id: string; item_id: string; quantity: number; uom: string };
        Update: Partial<Database["public"]["Tables"]["stock_transfer_lines"]["Insert"]>;
        Relationships: [];
      };
      stock_wastage: {
        Row: {
          id: string; company_id: string | null; document_id: string | null; wastage_no: string; wastage_date: string; branch_id: string | null; location_id: string;
          reason: StockWastageReason; status: StockOperationStatus; remarks: string | null; posted_at: string | null; created_at: string; updated_at: string;
          created_by: string | null; updated_by: string | null; deleted_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["stock_wastage"]["Row"]> & { wastage_no: string; location_id: string; reason: StockWastageReason };
        Update: Partial<Database["public"]["Tables"]["stock_wastage"]["Insert"]>;
        Relationships: [];
      };
      stock_wastage_lines: {
        Row: {
          id: string; stock_wastage_id: string; item_id: string; barcode: string | null; quantity: number; uom: string; reason: StockWastageReason;
          batch_no: string | null; expiry_date: string | null; remarks: string | null; created_at: string; updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["stock_wastage_lines"]["Row"]> & { stock_wastage_id: string; item_id: string; quantity: number; uom: string; reason: StockWastageReason };
        Update: Partial<Database["public"]["Tables"]["stock_wastage_lines"]["Insert"]>;
        Relationships: [];
      };
    };
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
          location_id: string;
          location_name: string;
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
      item_location_stock_balances: {
        Row: {
          item_id: string;
          item_code: string;
          item_name: string;
          category: string;
          base_unit: string;
          location_id: string;
          location_code: string;
          location_name: string;
          location_type: LocationType;
          total_quantity_in: number;
          total_quantity_out: number;
          current_stock: number;
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
          location_id: string;
          location_name: string;
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
          location_id: string;
          location_name: string;
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
      has_admin_staff_assignment: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      bootstrap_first_admin: {
        Args: Record<string, never>;
        Returns: void;
      };
    };
    Enums: {
      item_status: ItemStatus;
      supplier_status: SupplierStatus;
      location_status: LocationStatus;
      location_type: LocationType;
      branch_type: BranchType;
      staff_access_level: StaffAccessLevel;
      reset_frequency: ResetFrequency;
      barcode_type: BarcodeType;
      stock_entity_type: StockEntityType;
      record_status: RecordStatus;
      stock_transaction_type: StockTransactionType;
      stock_transaction_status: StockTransactionStatus;
      stock_count_status: StockCountStatus;
      stock_operation_status: StockOperationStatus;
      stock_wastage_reason: StockWastageReason;
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
