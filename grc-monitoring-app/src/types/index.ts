// ─── Enums ────────────────────────────────────────────────────────────────────

export type OpportunityStatus =
  | "Submitted"
  | "Win"
  | "Lose"
  | "Waiting for Result"
  | "Waiting for RFP"
  | "Backlog"
  | "Withdraw"
  | "Cancelled"
  | "Transferred"
  | "In Progress"

export type ProjectStatus = "Active" | "Completed" | "On Hold" | "Cancelled"

export type TeamRole = "Manager" | "Senior" | "Staff" | "Admin"

// ─── Core entities (mirrors Supabase tables) ──────────────────────────────────

export interface Client {
  id: string
  name: string
  industry: string | null
  contact_person: string | null
  contact_email: string | null
  contact_phone: string | null
  created_at: string
}

export interface ServiceType {
  id: string
  name: string
  description: string | null
}

export interface SubService {
  id: string
  service_type_id: string
  name: string
  description: string | null
}

export interface TeamMember {
  id: string
  name: string
  email: string
  role: TeamRole
  is_active: boolean
  created_at: string
}

export interface Opportunity {
  id: string
  title: string
  client_id: string
  service_type_id: string | null
  sub_service_id: string | null
  status: OpportunityStatus
  submitted_date: string | null
  value_idr: number | null
  pic_id: string | null          // person-in-charge (TeamMember)
  notes: string | null
  created_at: string
  updated_at: string
  // joined relations
  client?: Client
  service_type?: ServiceType
  sub_service?: SubService
  pic?: TeamMember
}

export interface Project {
  id: string
  opportunity_id: string | null
  client_id: string
  name: string
  spk_number: string | null
  pks_number: string | null
  start_date: string | null
  end_date: string | null
  total_value_idr: number | null
  status: ProjectStatus
  notes: string | null
  created_at: string
  updated_at: string
  // joined relations
  client?: Client
  opportunity?: Opportunity
  team_members?: ProjectTeamMember[]
  termins?: Termin[]
}

export interface ProjectTeamMember {
  id: string
  project_id: string
  team_member_id: string
  role_in_project: string | null
  hours_allocated: number | null
  hours_current: number | null
  team_member?: TeamMember
}

export interface Termin {
  id: string
  project_id: string
  termin_number: number          // 1-4
  description: string | null
  fee_idr: number | null
  is_paid: boolean
  due_date: string | null
  paid_date: string | null
}

// ─── Dashboard aggregates ─────────────────────────────────────────────────────

export interface DashboardStats {
  total_opportunities: number
  win_count: number
  lose_count: number
  in_progress_count: number
  win_rate: number               // percentage 0-100
  pipeline_value_idr: number     // sum of non-lost opportunities
  active_projects: number
  total_revenue_idr: number      // sum of paid termins
  pending_revenue_idr: number    // sum of unpaid termins on active projects
}

export interface TeamWorkload {
  team_member_id: string
  name: string
  active_projects: number
  hours_allocated: number
  hours_current: number
}
