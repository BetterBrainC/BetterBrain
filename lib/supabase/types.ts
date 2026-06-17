// AUTO-GENERATED from Supabase (project azqlbiaxuwmlunfcbkoq) via MCP generate_typescript_types.
// Do not edit by hand; re-run generation after schema changes.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: Database["public"]["Enums"]["audit_action"]
          actor_id: string | null
          actor_role: Database["public"]["Enums"]["user_role"] | null
          after: Json | null
          before: Json | null
          changed_cols: string[] | null
          context: Json | null
          entity: string | null
          entity_id: string | null
          id: number
          ip: unknown
          occurred_at: string
          request_id: string | null
          user_agent: string | null
        }
        Insert: {
          action: Database["public"]["Enums"]["audit_action"]
          actor_id?: string | null
          actor_role?: Database["public"]["Enums"]["user_role"] | null
          after?: Json | null
          before?: Json | null
          changed_cols?: string[] | null
          context?: Json | null
          entity?: string | null
          entity_id?: string | null
          id?: never
          ip?: unknown
          occurred_at?: string
          request_id?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: Database["public"]["Enums"]["audit_action"]
          actor_id?: string | null
          actor_role?: Database["public"]["Enums"]["user_role"] | null
          after?: Json | null
          before?: Json | null
          changed_cols?: string[] | null
          context?: Json | null
          entity?: string | null
          entity_id?: string | null
          id?: never
          ip?: unknown
          occurred_at?: string
          request_id?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      bookings: {
        Row: {
          area: string | null
          consent_booking: boolean
          created_at: string
          created_by: string | null
          full_name: string
          id: string
          note: string | null
          patient_id: string | null
          phone: string
          source: string
          status: Database["public"]["Enums"]["booking_status"]
          updated_at: string
        }
        Insert: {
          area?: string | null
          consent_booking?: boolean
          created_at?: string
          created_by?: string | null
          full_name: string
          id?: string
          note?: string | null
          patient_id?: string | null
          phone: string
          source?: string
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
        }
        Update: {
          area?: string | null
          consent_booking?: boolean
          created_at?: string
          created_by?: string | null
          full_name?: string
          id?: string
          note?: string | null
          patient_id?: string | null
          phone?: string
          source?: string
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      check_ins: {
        Row: {
          client_event_at: string
          corrected: boolean
          device_id: string | null
          distance_m: number | null
          employee_id: string
          id: string
          is_early: boolean
          is_late: boolean
          kind: Database["public"]["Enums"]["checkin_kind"]
          lat: number
          lng: number
          selfie_url: string | null
          server_received_at: string
          session_id: string
          within_geofence: boolean | null
        }
        Insert: {
          client_event_at: string
          corrected?: boolean
          device_id?: string | null
          distance_m?: number | null
          employee_id: string
          id: string
          is_early?: boolean
          is_late?: boolean
          kind?: Database["public"]["Enums"]["checkin_kind"]
          lat: number
          lng: number
          selfie_url?: string | null
          server_received_at?: string
          session_id: string
          within_geofence?: boolean | null
        }
        Update: {
          client_event_at?: string
          corrected?: boolean
          device_id?: string | null
          distance_m?: number | null
          employee_id?: string
          id?: string
          is_early?: boolean
          is_late?: boolean
          kind?: Database["public"]["Enums"]["checkin_kind"]
          lat?: number
          lng?: number
          selfie_url?: string | null
          server_received_at?: string
          session_id?: string
          within_geofence?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "check_ins_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_ins_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "schedule_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      correction_requests: {
        Row: {
          applied_at: string | null
          applied_by: string | null
          approved_at: string | null
          approved_by: string | null
          before_snapshot: Json | null
          check_in_id: string | null
          created_at: string
          decision_note: string | null
          employee_id: string
          id: string
          reason: string
          requested_changes: Json
          session_id: string
          status: Database["public"]["Enums"]["request_status"]
          updated_at: string
        }
        Insert: {
          applied_at?: string | null
          applied_by?: string | null
          approved_at?: string | null
          approved_by?: string | null
          before_snapshot?: Json | null
          check_in_id?: string | null
          created_at?: string
          decision_note?: string | null
          employee_id: string
          id?: string
          reason: string
          requested_changes?: Json
          session_id: string
          status?: Database["public"]["Enums"]["request_status"]
          updated_at?: string
        }
        Update: {
          applied_at?: string | null
          applied_by?: string | null
          approved_at?: string | null
          approved_by?: string | null
          before_snapshot?: Json | null
          check_in_id?: string | null
          created_at?: string
          decision_note?: string | null
          employee_id?: string
          id?: string
          reason?: string
          requested_changes?: Json
          session_id?: string
          status?: Database["public"]["Enums"]["request_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "correction_requests_applied_by_fkey"
            columns: ["applied_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "correction_requests_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "correction_requests_check_in_id_fkey"
            columns: ["check_in_id"]
            isOneToOne: false
            referencedRelation: "check_ins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "correction_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "correction_requests_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "schedule_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          base_sessions: number
          bonus_sessions: number
          completed_on: string | null
          course_type: Database["public"]["Enums"]["course_type"]
          created_at: string
          created_by: string | null
          id: string
          outcome: Database["public"]["Enums"]["course_outcome"] | null
          patient_id: string
          price: number | null
          started_on: string | null
          status: Database["public"]["Enums"]["course_status"]
          total_sessions: number | null
          updated_at: string
        }
        Insert: {
          base_sessions: number
          bonus_sessions?: number
          completed_on?: string | null
          course_type: Database["public"]["Enums"]["course_type"]
          created_at?: string
          created_by?: string | null
          id?: string
          outcome?: Database["public"]["Enums"]["course_outcome"] | null
          patient_id: string
          price?: number | null
          started_on?: string | null
          status?: Database["public"]["Enums"]["course_status"]
          total_sessions?: number | null
          updated_at?: string
        }
        Update: {
          base_sessions?: number
          bonus_sessions?: number
          completed_on?: string | null
          course_type?: Database["public"]["Enums"]["course_type"]
          created_at?: string
          created_by?: string | null
          id?: string
          outcome?: Database["public"]["Enums"]["course_outcome"] | null
          patient_id?: string
          price?: number | null
          started_on?: string | null
          status?: Database["public"]["Enums"]["course_status"]
          total_sessions?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      diagnoses: {
        Row: {
          category: Database["public"]["Enums"]["diagnosis_category"]
          label_en: string
          sort: number
        }
        Insert: {
          category: Database["public"]["Enums"]["diagnosis_category"]
          label_en: string
          sort?: number
        }
        Update: {
          category?: Database["public"]["Enums"]["diagnosis_category"]
          label_en?: string
          sort?: number
        }
        Relationships: []
      }
      kpi_evaluations: {
        Row: {
          answers: Json
          barthel_index: number | null
          created_at: string
          employee_id: string | null
          employee_kpi_kind:
            | Database["public"]["Enums"]["employee_kpi_kind"]
            | null
          evaluated_by: string
          evaluated_on: string
          fois_level: Database["public"]["Enums"]["fois_level"] | null
          function_checklist: Json
          id: string
          patient_id: string | null
          period_year: number | null
          progress_kind: string | null
          report_id: string | null
          score: number | null
          target: Database["public"]["Enums"]["kpi_target"]
          template_id: string | null
        }
        Insert: {
          answers?: Json
          barthel_index?: number | null
          created_at?: string
          employee_id?: string | null
          employee_kpi_kind?:
            | Database["public"]["Enums"]["employee_kpi_kind"]
            | null
          evaluated_by: string
          evaluated_on?: string
          fois_level?: Database["public"]["Enums"]["fois_level"] | null
          function_checklist?: Json
          id?: string
          patient_id?: string | null
          period_year?: number | null
          progress_kind?: string | null
          report_id?: string | null
          score?: number | null
          target: Database["public"]["Enums"]["kpi_target"]
          template_id?: string | null
        }
        Update: {
          answers?: Json
          barthel_index?: number | null
          created_at?: string
          employee_id?: string | null
          employee_kpi_kind?:
            | Database["public"]["Enums"]["employee_kpi_kind"]
            | null
          evaluated_by?: string
          evaluated_on?: string
          fois_level?: Database["public"]["Enums"]["fois_level"] | null
          function_checklist?: Json
          id?: string
          patient_id?: string | null
          period_year?: number | null
          progress_kind?: string | null
          report_id?: string | null
          score?: number | null
          target?: Database["public"]["Enums"]["kpi_target"]
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kpi_evaluations_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpi_evaluations_evaluated_by_fkey"
            columns: ["evaluated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpi_evaluations_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpi_evaluations_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpi_evaluations_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "kpi_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_templates: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          kind: Database["public"]["Enums"]["employee_kpi_kind"]
          period_year: number
          questions: Json
          title: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          kind: Database["public"]["Enums"]["employee_kpi_kind"]
          period_year: number
          questions?: Json
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          kind?: Database["public"]["Enums"]["employee_kpi_kind"]
          period_year?: number
          questions?: Json
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "kpi_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          audience: Database["public"]["Enums"]["notification_audience"]
          body: string | null
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at: string
          data: Json
          dedupe_key: string | null
          id: string
          read_at: string | null
          recipient_profile_id: string | null
          recipient_relative_id: string | null
          scheduled_for: string | null
          sent_at: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
        }
        Insert: {
          audience: Database["public"]["Enums"]["notification_audience"]
          body?: string | null
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          data?: Json
          dedupe_key?: string | null
          id?: string
          read_at?: string | null
          recipient_profile_id?: string | null
          recipient_relative_id?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
        }
        Update: {
          audience?: Database["public"]["Enums"]["notification_audience"]
          body?: string | null
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          data?: Json
          dedupe_key?: string | null
          id?: string
          read_at?: string | null
          recipient_profile_id?: string | null
          recipient_relative_id?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
        }
        Relationships: [
          {
            foreignKeyName: "notifications_recipient_profile_id_fkey"
            columns: ["recipient_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_recipient_relative_id_fkey"
            columns: ["recipient_relative_id"]
            isOneToOne: false
            referencedRelation: "relatives"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_assignments: {
        Row: {
          employee_id: string
          granted_at: string
          patient_id: string
        }
        Insert: {
          employee_id: string
          granted_at?: string
          patient_id: string
        }
        Update: {
          employee_id?: string
          granted_at?: string
          patient_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_assignments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_assignments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          address: string | null
          age_years: number | null
          archived_at: string | null
          chief_complaint: string | null
          consent_intake: boolean
          consent_version: string | null
          created_at: string
          created_by: string | null
          diagnosis_category:
            | Database["public"]["Enums"]["diagnosis_category"]
            | null
          dob: string | null
          drug_allergy: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          emergency_contact_relation: string | null
          full_name: string
          gender: Database["public"]["Enums"]["gender"] | null
          hn: string | null
          home_lat: number | null
          home_lng: number | null
          id: string
          marital_status: string | null
          national_id: string | null
          nationality: string | null
          past_history: string | null
          phone: string | null
          race: string | null
          referral_source: string | null
          status: Database["public"]["Enums"]["patient_status"]
          surgery_history: string | null
          training_program: string | null
          underlying: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          age_years?: number | null
          archived_at?: string | null
          chief_complaint?: string | null
          consent_intake?: boolean
          consent_version?: string | null
          created_at?: string
          created_by?: string | null
          diagnosis_category?:
            | Database["public"]["Enums"]["diagnosis_category"]
            | null
          dob?: string | null
          drug_allergy?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relation?: string | null
          full_name: string
          gender?: Database["public"]["Enums"]["gender"] | null
          hn?: string | null
          home_lat?: number | null
          home_lng?: number | null
          id?: string
          marital_status?: string | null
          national_id?: string | null
          nationality?: string | null
          past_history?: string | null
          phone?: string | null
          race?: string | null
          referral_source?: string | null
          status?: Database["public"]["Enums"]["patient_status"]
          surgery_history?: string | null
          training_program?: string | null
          underlying?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          age_years?: number | null
          archived_at?: string | null
          chief_complaint?: string | null
          consent_intake?: boolean
          consent_version?: string | null
          created_at?: string
          created_by?: string | null
          diagnosis_category?:
            | Database["public"]["Enums"]["diagnosis_category"]
            | null
          dob?: string | null
          drug_allergy?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relation?: string | null
          full_name?: string
          gender?: Database["public"]["Enums"]["gender"] | null
          hn?: string | null
          home_lat?: number | null
          home_lng?: number | null
          id?: string
          marital_status?: string | null
          national_id?: string | null
          nationality?: string | null
          past_history?: string | null
          phone?: string | null
          race?: string | null
          referral_source?: string | null
          status?: Database["public"]["Enums"]["patient_status"]
          surgery_history?: string | null
          training_program?: string | null
          underlying?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patients_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          department: string | null
          employee_code: string | null
          employment_type: Database["public"]["Enums"]["employment_type"]
          full_name: string
          id: string
          is_enabled: boolean
          license_no: string | null
          phone: string | null
          photo_url: string | null
          position_title: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          department?: string | null
          employee_code?: string | null
          employment_type?: Database["public"]["Enums"]["employment_type"]
          full_name: string
          id: string
          is_enabled?: boolean
          license_no?: string | null
          phone?: string | null
          photo_url?: string | null
          position_title?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          department?: string | null
          employee_code?: string | null
          employment_type?: Database["public"]["Enums"]["employment_type"]
          full_name?: string
          id?: string
          is_enabled?: boolean
          license_no?: string | null
          phone?: string | null
          photo_url?: string | null
          position_title?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          is_active: boolean
          last_used_at: string | null
          p256dh: string
          profile_id: string | null
          relative_id: string | null
          user_agent: string | null
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          p256dh: string
          profile_id?: string | null
          relative_id?: string | null
          user_agent?: string | null
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          p256dh?: string
          profile_id?: string | null
          relative_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_subscriptions_relative_id_fkey"
            columns: ["relative_id"]
            isOneToOne: false
            referencedRelation: "relatives"
            referencedColumns: ["id"]
          },
        ]
      }
      relative_access: {
        Row: {
          access_token: string
          consent_relative_portal: boolean
          created_at: string
          expires_at: string | null
          id: string
          patient_id: string
          relative_id: string
          revoked: boolean
          show_followup: boolean
          show_summary: boolean
        }
        Insert: {
          access_token: string
          consent_relative_portal?: boolean
          created_at?: string
          expires_at?: string | null
          id?: string
          patient_id: string
          relative_id: string
          revoked?: boolean
          show_followup?: boolean
          show_summary?: boolean
        }
        Update: {
          access_token?: string
          consent_relative_portal?: boolean
          created_at?: string
          expires_at?: string | null
          id?: string
          patient_id?: string
          relative_id?: string
          revoked?: boolean
          show_followup?: boolean
          show_summary?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "relative_access_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relative_access_relative_id_fkey"
            columns: ["relative_id"]
            isOneToOne: false
            referencedRelation: "relatives"
            referencedColumns: ["id"]
          },
        ]
      }
      relatives: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          is_active: boolean
          line_user_id: string | null
          patient_id: string
          phone: string | null
          relation: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean
          line_user_id?: string | null
          patient_id: string
          phone?: string | null
          relation?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean
          line_user_id?: string | null
          patient_id?: string
          phone?: string | null
          relation?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "relatives_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          attachments: Json
          author_id: string
          check_in_id: string | null
          completed_at: string | null
          course_id: string | null
          created_at: string
          discarded_at: string | null
          fois_level: Database["public"]["Enums"]["fois_level"] | null
          id: string
          patient_id: string
          payload: Json
          report_date: string
          report_type: Database["public"]["Enums"]["report_type"]
          session_id: string | null
          status: Database["public"]["Enums"]["report_status"]
          updated_at: string
        }
        Insert: {
          attachments?: Json
          author_id: string
          check_in_id?: string | null
          completed_at?: string | null
          course_id?: string | null
          created_at?: string
          discarded_at?: string | null
          fois_level?: Database["public"]["Enums"]["fois_level"] | null
          id?: string
          patient_id: string
          payload?: Json
          report_date?: string
          report_type: Database["public"]["Enums"]["report_type"]
          session_id?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          updated_at?: string
        }
        Update: {
          attachments?: Json
          author_id?: string
          check_in_id?: string | null
          completed_at?: string | null
          course_id?: string | null
          created_at?: string
          discarded_at?: string | null
          fois_level?: Database["public"]["Enums"]["fois_level"] | null
          id?: string
          patient_id?: string
          payload?: Json
          report_date?: string
          report_type?: Database["public"]["Enums"]["report_type"]
          session_id?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_check_in_id_fkey"
            columns: ["check_in_id"]
            isOneToOne: false
            referencedRelation: "check_ins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "course_progress"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "reports_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "schedule_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_sessions: {
        Row: {
          assigned_by: string | null
          counts_as_training: boolean
          course_id: string | null
          coverage_status: Database["public"]["Enums"]["coverage_status"]
          created_at: string
          employee_id: string
          id: string
          is_special_case: boolean
          kind: Database["public"]["Enums"]["session_kind"]
          note: string | null
          patient_id: string
          scheduled_date: string
          scheduled_end: string | null
          scheduled_start: string
          slot_id: string | null
          special_amount: number | null
          special_note: string | null
          status: Database["public"]["Enums"]["session_status"]
          substituted_from: string | null
          substitution_reason: string | null
          updated_at: string
        }
        Insert: {
          assigned_by?: string | null
          counts_as_training?: boolean
          course_id?: string | null
          coverage_status?: Database["public"]["Enums"]["coverage_status"]
          created_at?: string
          employee_id: string
          id?: string
          is_special_case?: boolean
          kind?: Database["public"]["Enums"]["session_kind"]
          note?: string | null
          patient_id: string
          scheduled_date: string
          scheduled_end?: string | null
          scheduled_start: string
          slot_id?: string | null
          special_amount?: number | null
          special_note?: string | null
          status?: Database["public"]["Enums"]["session_status"]
          substituted_from?: string | null
          substitution_reason?: string | null
          updated_at?: string
        }
        Update: {
          assigned_by?: string | null
          counts_as_training?: boolean
          course_id?: string | null
          coverage_status?: Database["public"]["Enums"]["coverage_status"]
          created_at?: string
          employee_id?: string
          id?: string
          is_special_case?: boolean
          kind?: Database["public"]["Enums"]["session_kind"]
          note?: string | null
          patient_id?: string
          scheduled_date?: string
          scheduled_end?: string | null
          scheduled_start?: string
          slot_id?: string | null
          special_amount?: number | null
          special_note?: string | null
          status?: Database["public"]["Enums"]["session_status"]
          substituted_from?: string | null
          substitution_reason?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_sessions_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_sessions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "course_progress"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "schedule_sessions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_sessions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_sessions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_sessions_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "work_hour_slots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_sessions_substituted_from_fkey"
            columns: ["substituted_from"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          company_name: string
          early_threshold_minutes: number
          extra: Json
          geofence_radius_m: number
          id: number
          late_threshold_minutes: number
          logo_url: string | null
          reminder_lead_days: number
          selfie_enforced: boolean
          session_9_alert_enabled: boolean
          updated_at: string
        }
        Insert: {
          company_name?: string
          early_threshold_minutes?: number
          extra?: Json
          geofence_radius_m?: number
          id?: number
          late_threshold_minutes?: number
          logo_url?: string | null
          reminder_lead_days?: number
          selfie_enforced?: boolean
          session_9_alert_enabled?: boolean
          updated_at?: string
        }
        Update: {
          company_name?: string
          early_threshold_minutes?: number
          extra?: Json
          geofence_radius_m?: number
          id?: number
          late_threshold_minutes?: number
          logo_url?: string | null
          reminder_lead_days?: number
          selfie_enforced?: boolean
          session_9_alert_enabled?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      work_hour_slots: {
        Row: {
          created_at: string
          employee_id: string
          id: string
          is_active: boolean
          slot_end: string
          slot_start: string
          weekday: number | null
        }
        Insert: {
          created_at?: string
          employee_id: string
          id?: string
          is_active?: boolean
          slot_end: string
          slot_start: string
          weekday?: number | null
        }
        Update: {
          created_at?: string
          employee_id?: string
          id?: string
          is_active?: boolean
          slot_end?: string
          slot_start?: string
          weekday?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "work_hour_slots_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      course_progress: {
        Row: {
          base_sessions: number | null
          bonus_sessions: number | null
          course_id: string | null
          remaining_sessions: number | null
          total_sessions: number | null
          used_sessions: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      can_access_patient: { Args: { p_patient_id: string }; Returns: boolean }
      current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      is_admin: { Args: never; Returns: boolean }
      is_director: { Args: never; Returns: boolean }
      is_enabled: { Args: never; Returns: boolean }
      is_staff: { Args: never; Returns: boolean }
      complete_session: {
        Args: { p_session_id: string }
        Returns: undefined
      }
      kpi_questions_for_employee: {
        Args: {
          p_kind: Database["public"]["Enums"]["employee_kpi_kind"]
          p_year: number
        }
        Returns: { template_id: string; questions: Json }[]
      }
      record_check_event: {
        Args: {
          p_distance_m: number
          p_event_id?: string
          p_is_early?: boolean
          p_is_late?: boolean
          p_kind: Database["public"]["Enums"]["checkin_kind"]
          p_lat: number
          p_lng: number
          p_selfie_url?: string
          p_session_id: string
          p_within: boolean
        }
        Returns: undefined
      }
      save_followup: {
        Args: {
          p_fois?: Database["public"]["Enums"]["fois_level"]
          p_payload?: Json
          p_report_id?: string
          p_session_id: string
        }
        Returns: string
      }
    }
    Enums: {
      audit_action:
        | "login"
        | "logout"
        | "create"
        | "update"
        | "delete"
        | "check_in"
        | "check_out"
        | "approve"
        | "reject"
        | "apply_correction"
        | "password_change"
        | "export"
      booking_status: "booked" | "awaiting_payment" | "cancelled"
      checkin_kind: "check_in" | "check_out"
      course_outcome: "continue" | "no_service"
      course_status: "on_process" | "hold" | "course_complete" | "no_service"
      course_type: "pkg_10_plus_1" | "pkg_30"
      coverage_status: "not_required" | "needs_substitute" | "covered"
      diagnosis_category:
        | "stroke"
        | "parkinson"
        | "dementia_alzheimer"
        | "als"
        | "ms"
        | "other"
      employee_kpi_kind: "stress" | "knowledge"
      employment_type: "monthly" | "part_time"
      fois_level: "L1" | "L2" | "L3" | "L4" | "L5" | "L6" | "L7"
      gender: "male" | "female" | "other"
      kpi_target: "patient" | "employee"
      notification_audience: "employee" | "admin" | "director" | "relative"
      notification_channel: "in_app" | "push" | "email" | "line"
      notification_type:
        | "session_reminder_1d"
        | "course_ending"
        | "session_alert_9"
        | "course_remaining_0"
        | "correction_decision"
        | "substitute_needed"
        | "substitute_assigned"
        | "generic"
      patient_status: "active" | "hold" | "no_service"
      report_status: "draft" | "completed" | "corrected" | "discarded"
      report_type:
        | "assessment_swallow"
        | "assessment_hand"
        | "followup"
        | "summary"
      request_status:
        | "pending"
        | "approved"
        | "rejected"
        | "applied"
        | "cancelled"
      session_kind: "assessment" | "treatment"
      session_status:
        | "scheduled"
        | "in_progress"
        | "attended"
        | "late"
        | "completed"
        | "no_checkin"
        | "skipped"
        | "rescheduled"
        | "cancelled"
        | "corrected"
      user_role: "employee" | "admin" | "director"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      audit_action: [
        "login",
        "logout",
        "create",
        "update",
        "delete",
        "check_in",
        "check_out",
        "approve",
        "reject",
        "apply_correction",
        "password_change",
        "export",
      ],
      booking_status: ["booked", "awaiting_payment", "cancelled"],
      checkin_kind: ["check_in", "check_out"],
      course_outcome: ["continue", "no_service"],
      course_status: ["on_process", "hold", "course_complete", "no_service"],
      course_type: ["pkg_10_plus_1", "pkg_30"],
      coverage_status: ["not_required", "needs_substitute", "covered"],
      diagnosis_category: [
        "stroke",
        "parkinson",
        "dementia_alzheimer",
        "als",
        "ms",
        "other",
      ],
      employee_kpi_kind: ["stress", "knowledge"],
      employment_type: ["monthly", "part_time"],
      fois_level: ["L1", "L2", "L3", "L4", "L5", "L6", "L7"],
      gender: ["male", "female", "other"],
      kpi_target: ["patient", "employee"],
      notification_audience: ["employee", "admin", "director", "relative"],
      notification_channel: ["in_app", "push", "email", "line"],
      notification_type: [
        "session_reminder_1d",
        "course_ending",
        "session_alert_9",
        "course_remaining_0",
        "correction_decision",
        "substitute_needed",
        "substitute_assigned",
        "generic",
      ],
      patient_status: ["active", "hold", "no_service"],
      report_status: ["draft", "completed", "corrected", "discarded"],
      report_type: [
        "assessment_swallow",
        "assessment_hand",
        "followup",
        "summary",
      ],
      request_status: [
        "pending",
        "approved",
        "rejected",
        "applied",
        "cancelled",
      ],
      session_kind: ["assessment", "treatment"],
      session_status: [
        "scheduled",
        "in_progress",
        "attended",
        "late",
        "completed",
        "no_checkin",
        "skipped",
        "rescheduled",
        "cancelled",
        "corrected",
      ],
      user_role: ["employee", "admin", "director"],
    },
  },
} as const

