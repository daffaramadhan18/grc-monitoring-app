export const OPP_STATUSES = [
  'Win',
  'Lose',
  'Waiting for Result',
  'Withdraw',
  'Cancelled',
  'Backlog',
  'Transfer to others',
  'In progress',
  'Submitted',
] as const

export const PROJECT_STATUSES = [
  'Planning',
  'Fieldwork',
  'Reporting',
  'Finish',
] as const

export const TERMIN_STATUSES = [
  'Deliverables in Progress',
  'Invoice Requested',
  'Invoice Sent',
  'Paid',
] as const

export const ACTIVE_PROJECT_STATUSES = ['Fieldwork', 'Reporting'] as const

export const ACTIVE_OPP_STATUSES = ['Waiting for Result', 'Backlog', 'In progress'] as const

export const OPP_TM_FIELDS = [
  'micInitial',
  'tm1Initial',
  'tm2Initial',
  'tm3Initial',
  'tm4Initial',
  'tm5Initial',
  'tm6Initial',
] as const
