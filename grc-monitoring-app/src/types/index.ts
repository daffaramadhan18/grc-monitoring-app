// ─── Enums ────────────────────────────────────────────────────────────────────

export type OpportunityFase = 'RFI' | 'RFP' | 'Diskusi Awal'

export type OpportunityStatus =
  | 'Submitted'
  | 'Win'
  | 'Lose'
  | 'Waiting for Result'
  | 'Waiting for RFP'
  | 'Backlog'
  | 'Withdraw'
  | 'Cancelled'
  | 'Transferred'
  | 'In Progress'

export type OpportunityProbability = 'High' | 'Medium' | 'Low'

export type ProjectStatus = 'Planning' | 'Fieldwork' | 'Reporting' | 'Finish'

export type ProjectOwner = 'ITGRC-S' | 'Non ITGRC-S'

export type TerminStatus = 'Unpaid' | 'Invoice Requested' | 'Invoice Sent' | 'Paid'

// ─── Core entities ────────────────────────────────────────────────────────────

export interface ServiceType {
  id: number
  name: string
}

export interface SubService {
  id: number
  name: string
  service_type_id: number
}

export interface Client {
  id: number
  initial: string
  full_name: string
}

export interface TeamMember {
  id: number
  initial: string
  full_name: string
  level: string
}

export interface Opportunity {
  id: number
  service_type_id: number | null
  sub_service_id: number | null
  client_id: number
  proposal_name: string
  fase: OpportunityFase | null
  status: OpportunityStatus
  probability: OpportunityProbability | null
  revenue_cf: number | null
  harga: number | null
  rr_percentage: number | null
  expected_date: string | null
  submitted_date: string | null
  notes: string | null
  mic_id: number | null
  tm1_id: number | null
  tm2_id: number | null
  tm3_id: number | null
  tm4_id: number | null
  tm5_id: number | null
  tm6_id: number | null
  created_at: string
  updated_at: string
  // joined
  client?: Client
  service_type?: ServiceType
  sub_service?: SubService
  mic?: TeamMember
}

export interface Project {
  id: number
  opportunity_id: number | null
  proposal_name: string
  client_id: number
  project_owner: ProjectOwner | null
  mic_id: number | null
  tm1_id: number | null
  tm2_id: number | null
  tm3_id: number | null
  tm4_id: number | null
  tm5_id: number | null
  tm6_id: number | null
  started_date: string | null
  end_date: string | null
  status: ProjectStatus
  spk: string | null
  pks: string | null
  confirmed_fee: number | null
  alokasi_hours: number | null
  current_hours: number | null
  created_at: string
  updated_at: string
  // joined
  client?: Client
  mic?: TeamMember
  termins?: Termin[]
}

export interface Termin {
  id: number
  project_id: number
  termin_number: number
  percentage: number | null
  fee: number | null
  status: TerminStatus
  created_at: string
  updated_at: string
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export interface DashboardStats {
  total_opportunities: number
  win_count: number
  lose_count: number
  in_progress_count: number
  win_rate: number
  pipeline_value: number
  active_projects: number
  total_revenue: number
  pending_revenue: number
  opp_by_status: Record<string, number>
  project_by_status: Record<string, number>
  total_confirmed_fee: number
  revenue_by_termin_status: Record<string, number>
}
