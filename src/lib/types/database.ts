export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          role: "employee" | "admin";
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          role: "employee" | "admin";
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          role?: "employee" | "admin";
          is_active?: boolean;
          created_at?: string;
        };
      };
      employees: {
        Row: {
          id: string;
          profile_id: string | null;
          full_name: string;
          display_order: number | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          profile_id?: string | null;
          full_name: string;
          display_order?: number | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string | null;
          full_name?: string;
          display_order?: number | null;
          is_active?: boolean;
          created_at?: string;
        };
      };
      services: {
        Row: {
          id: string;
          name: string;
          price: number;
          is_half_turn: boolean;
          is_active: boolean;
          color: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          price: number;
          is_half_turn?: boolean;
          is_active?: boolean;
          color?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          price?: number;
          is_half_turn?: boolean;
          is_active?: boolean;
          color?: string;
          created_at?: string;
        };
      };
      daily_sessions: {
        Row: {
          id: string;
          date: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          date: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          date?: string;
          created_at?: string;
        };
      };
      clock_ins: {
        Row: {
          id: string;
          session_id: string;
          employee_id: string;
          clock_in_time: string;
          clock_out_time: string | null;
          position: number;
        };
        Insert: {
          id?: string;
          session_id: string;
          employee_id: string;
          clock_in_time?: string;
          clock_out_time?: string | null;
          position: number;
        };
        Update: {
          id?: string;
          session_id?: string;
          employee_id?: string;
          clock_in_time?: string;
          clock_out_time?: string | null;
          position?: number;
        };
      };
      turns: {
        Row: {
          id: string;
          session_id: string;
          employee_id: string;
          service_id: string;
          turn_number: number;
          is_half_turn: boolean;
          status: "in_progress" | "completed";
          started_at: string;
          completed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          employee_id: string;
          service_id: string;
          turn_number: number;
          is_half_turn: boolean;
          status?: "in_progress" | "completed";
          started_at?: string;
          completed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          employee_id?: string;
          service_id?: string;
          turn_number?: number;
          is_half_turn?: boolean;
          status?: "in_progress" | "completed";
          started_at?: string;
          completed_at?: string | null;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

// Convenience types
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Employee = Database["public"]["Tables"]["employees"]["Row"];
export type Service = Database["public"]["Tables"]["services"]["Row"];
export type DailySession = Database["public"]["Tables"]["daily_sessions"]["Row"];
export type ClockIn = Database["public"]["Tables"]["clock_ins"]["Row"];
export type Turn = Database["public"]["Tables"]["turns"]["Row"];

// Extended types with relations
export type EmployeeWithClockIn = Employee & {
  clock_in?: ClockIn | null;
};

export type TurnWithDetails = Turn & {
  employee: Employee;
  service: Service;
};

export type QueueEmployee = {
  employee: Employee;
  clockIn: ClockIn;
  completedTurns: number;
  hasHalfTurn: boolean;
  isInProgress: boolean;
  currentTurn?: Turn;
};
