export type Role = 'student' | 'expert' | 'admin'
export type RequestStatus = 'pending' | 'accepted' | 'declined' | 'cancelled'
export type SessionStatus = 'scheduled' | 'done'
export type SlotStatus = 'free' | 'booked'
export type WeeklyCommitment = 'yes' | 'maybe'

export interface User {
  id: string
  email: string
  name: string
  role: Role
  created_at: string
}

export interface StudentProfile {
  id: string
  user_id: string
  school?: string
  grade?: string
}

export interface ExpertProfile {
  id: string
  user_id: string
  real_name: string
  affiliation: string
  tags: string[]
  facebook_url?: string
  twitter_url?: string
  instagram_url?: string
  slack_url?: string
  bio?: string
  weekly_commitment: WeeklyCommitment
  profile_completed: boolean
}

export interface Question {
  id: string
  student_id: string
  title: string
  background: string
  hypothesis: string
  stuck_point: string
  tags: string[]
  created_at: string
  user?: User
}

export interface AvailabilitySlot {
  id: string
  expert_id: string
  start_datetime: string
  duration_minutes: number
  status: SlotStatus
  created_at: string
}

export interface Request {
  id: string
  question_id: string
  student_id: string
  expert_id: string
  slot_id: string
  status: RequestStatus
  created_at: string
  question?: Question
  student?: User
  expert?: User
  expert_profile?: ExpertProfile
  slot?: AvailabilitySlot
  session?: Session
  chat_thread?: ChatThread
}

export interface Session {
  id: string
  request_id: string
  scheduled_at: string
  status: SessionStatus
  created_at: string
  three_line_log?: ThreeLineLog
}

export interface ChatThread {
  id: string
  request_id: string
  student_id: string
  expert_id: string
  created_at: string
  messages?: ChatMessage[]
  student?: User
  expert?: User
  request?: Request
}

export interface ChatMessage {
  id: string
  thread_id: string
  sender_id: string
  message: string
  created_at: string
  sender?: User
}

export interface ThreeLineLog {
  id: string
  session_id: string
  submitted_by_student_id: string
  reframe: string
  next_step_48h: string
  referral_wish?: string
  executed_48h: boolean
  submitted_at: string
  approved_by_expert_id?: string
  approved_at?: string
  expert_comment?: string
}
