// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface LoginResponse {
  access_token: string
  token_type: string
  user_id: number
}

export interface MeResponse {
  id: number
  email: string
  nickname: string
  role: string
  created_at: string
}

// ─── Users ────────────────────────────────────────────────────────────────────

export interface ProfileResponse {
  id: number
  email: string
  nickname: string
  role: string
  created_at: string
}

// ─── Posts ────────────────────────────────────────────────────────────────────

export interface PostImageResponse {
  id: number
  image_url: string
  created_at: string
}

export interface PostResponse {
  id: number
  user_id: number
  nickname: string
  title: string
  content: string
  view_count: number | null
  created_at: string
  updated_at: string | null
  is_edited: boolean | null
  images: PostImageResponse[]
  like_count: number
  is_liked: boolean
  comment_count: number
}

export interface PostListResponse {
  items: PostResponse[]
  total: number
  page: number
  size: number
}

// ─── Comments ─────────────────────────────────────────────────────────────────

export interface CommentResponse {
  id: number
  post_id: number
  post_title: string
  user_id: number
  nickname: string
  parent_comment_id: number | null
  content: string
  created_at: string
  updated_at: string | null
}

// ─── Notifications ────────────────────────────────────────────────────────────

export interface NotificationResponse {
  id: number
  user_id: number
  type: string
  message: string
  related_id: number | null
  is_read: boolean
  created_at: string
}

// ─── Rooms ────────────────────────────────────────────────────────────────────

export interface RoomResponse {
  id: number
  name: string
  capacity: number
  description: string | null
  created_at: string
  is_available: boolean
}

export interface RoomSettingsResponse {
  id: number
  room_id: number
  open_time: string
  close_time: string
  slot_duration: number
  created_at: string
  updated_at: string | null
}

// ─── Reservations ─────────────────────────────────────────────────────────────

export interface ReservationResponse {
  id: number
  room_id: number
  user_id: number
  start_time: string
  end_time: string
  group_id: number | null
  created_at: string
  status: string
}

export interface ReservationParticipantResponse {
  id: number
  reservation_id: number
  user_id: number
  is_representative: boolean
}

// ─── Study Groups ─────────────────────────────────────────────────────────────

export interface StudyGroupResponse {
  id: number
  leader_id: number
  title: string
  description: string | null
  max_members: number
  current_members: number
  status: string
  created_at: string
}

export interface ApplicationSummary {
  id: number
  applicant_id: number
  status: string
  message: string | null
  created_at: string
}

export interface StudyGroupDetailResponse extends StudyGroupResponse {
  applications: ApplicationSummary[]
}

export interface ApplicationResponse {
  id: number
  group_id: number
  applicant_id: number
  status: string
  message: string | null
  created_at: string
}

export interface MyApplicationResponse extends ApplicationResponse {
  group_title: string
  group_status: string
}

// ─── Chat ─────────────────────────────────────────────────────────────────────

export interface ChatMessageResponse {
  id: number
  group_id: number
  sender_id: number
  sender_nickname: string
  content: string
  created_at: string
}

export interface ChatHistoryResponse {
  messages: ChatMessageResponse[]
  has_more: boolean
}

export interface ChatMemberResponse {
  user_id: number
  nickname: string
  is_leader: boolean
}

export interface ChatRoomInfoResponse {
  group_id: number
  group_title: string
  members: ChatMemberResponse[]
  unread_count: number
  notice?: string | null  // 공지사항 (백엔드 지원 시 연동, 현재는 localStorage 폴백)
}

export interface UnreadCountResponse {
  group_id: number
  unread_count: number
}

export interface ChatRoomListItem {
  group_id: number
  group_title: string
  member_count: number
  unread_count: number
  is_leader: boolean
  last_message?: string | null      // 최근 메시지 미리보기
  last_message_at?: string | null   // 최근 메시지 시각 (ISO)
}

/** WebSocket 수신 페이로드 */
export interface WsMessagePayload {
  type: 'message' | 'system' | 'error'
  id?: number
  group_id?: number
  sender_id?: number
  sender_nickname?: string
  content?: string
  created_at?: string
}
