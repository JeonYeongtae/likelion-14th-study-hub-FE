/**
 * GroupChatPage.tsx — Apple Music 3-panel layout
 *
 * [Left] Chat room list sidebar (liquid glass, MyPage 스타일)
 * [Center] Main chat messages
 * [Right] Member / notice panel (hamburger toggle, responsive)
 */

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { useAlert } from '../contexts/AlertContext';
import LiquidGlassBase from '../components/liquid-glass/LiquidGlassBase';
import type { ChatMessageResponse, ChatRoomInfoResponse, WsMessagePayload, ChatRoomListItem } from '../types/api';

const FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif";

// ─── 시간 포맷 ────────────────────────────────────────────────────────────────

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
}

function formatChatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0 && d.getDate() === now.getDate())
    return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
  if (diffDays <= 1 && now.getDate() - d.getDate() === 1) return '어제';
  if (diffDays < 7) return `${diffDays}일 전`;
  return d.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' });
}

function isSameDay(a: string, b: string) {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

// ─── 아바타 ───────────────────────────────────────────────────────────────────

function avatarColor(id: number) {
  const hue = (id * 47 + 120) % 360;
  return `hsl(${hue}, 55%, 52%)`;
}

function avatarColorFromGroupId(groupId: number) {
  const hue = (groupId * 53 + 180) % 360;
  return `hsl(${hue}, 48%, 50%)`;
}

function avatarInitial(name: string) {
  return name.charAt(0).toUpperCase();
}

// ─── 채팅 메시지 스켈레톤 ─────────────────────────────────────────────────────

const SHIMMER_STYLE = `
  @keyframes shimmer {
    0% { background-position: -400px 0; }
    100% { background-position: 400px 0; }
  }
  .chat-skeleton-shimmer {
    background: linear-gradient(90deg, #ebebeb 25%, #f5f5f5 50%, #ebebeb 75%);
    background-size: 800px 100%;
    animation: shimmer 1.4s infinite linear;
    border-radius: 10px;
  }
`;

const SKELETON_ROWS: { isMine: boolean; widths: number[] }[] = [
  { isMine: false, widths: [120, 180] },
  { isMine: true,  widths: [200] },
  { isMine: false, widths: [160] },
  { isMine: true,  widths: [140, 90] },
  { isMine: false, widths: [100, 220, 80] },
  { isMine: true,  widths: [180] },
  { isMine: false, widths: [130] },
  { isMine: true,  widths: [160, 110] },
];

function ChatMessagesSkeleton() {
  return (
    <>
      <style>{SHIMMER_STYLE}</style>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '16px 0' }}>
        {SKELETON_ROWS.map((row, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              flexDirection: row.isMine ? 'row-reverse' : 'row',
              alignItems: 'flex-end',
              gap: 8,
            }}
          >
            {!row.isMine && (
              <div
                className="chat-skeleton-shimmer"
                style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0 }}
              />
            )}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: row.isMine ? 'flex-end' : 'flex-start',
                gap: 5,
                maxWidth: '60%',
              }}
            >
              {row.widths.map((w, j) => (
                <div
                  key={j}
                  className="chat-skeleton-shimmer"
                  style={{ width: w, height: 36, borderRadius: row.isMine ? '18px 18px 4px 18px' : '18px 18px 18px 4px' }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// ─── 시스템 / 날짜 ────────────────────────────────────────────────────────────

function SystemLine({ content }: { content: string }) {
  return (
    <div style={{ textAlign: 'center', margin: '12px 0' }}>
      <span
        style={{
          display: 'inline-block',
          fontSize: 11,
          color: '#aeaeb2',
          background: 'rgba(174,174,178,0.10)',
          borderRadius: 999,
          padding: '3px 12px',
        }}
      >
        {content}
      </span>
    </div>
  );
}

function DateDivider({ dateStr }: { dateStr: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '18px 0 10px' }}>
      <div style={{ flex: 1, height: 1, background: 'rgba(0,0,0,0.08)' }} />
      <span style={{ fontSize: 11, color: '#aeaeb2', whiteSpace: 'nowrap' }}>{dateStr}</span>
      <div style={{ flex: 1, height: 1, background: 'rgba(0,0,0,0.08)' }} />
    </div>
  );
}

// ─── 메시지 버블 ──────────────────────────────────────────────────────────────

const CHAR_LIMIT = 650;
const LINE_LIMIT = 17;

function MessageBubble({
  msg,
  isMine,
  showAvatar,
  isAnimating,
  animOriginY,
  onAnimDone,
  onFullView,
  unreadCount,
}: {
  msg: ChatMessageResponse;
  isMine: boolean;
  showAvatar: boolean;
  isAnimating?: boolean;
  animOriginY?: number;
  onAnimDone?: () => void;
  onFullView?: () => void;
  unreadCount?: number;
}) {
  const iosAnim = isAnimating && isMine;
  const lines = msg.content.split('\n');
  const isLong = msg.content.length >= CHAR_LIMIT || lines.length >= LINE_LIMIT;
  let displayContent = msg.content;
  if (isLong) {
    displayContent =
      lines.length >= LINE_LIMIT ? lines.slice(0, LINE_LIMIT - 1).join('\n') : msg.content.slice(0, CHAR_LIMIT);
  }

  return (
    <motion.div
      initial={iosAnim ? { opacity: 1, y: animOriginY ?? 72 } : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={iosAnim ? { type: 'spring', damping: 26, stiffness: 280, mass: 0.85 } : { duration: 0.2 }}
      onAnimationComplete={iosAnim ? onAnimDone : undefined}
      style={{
        display: 'flex',
        flexDirection: isMine ? 'row-reverse' : 'row',
        alignItems: 'flex-end',
        gap: 8,
        marginBottom: 4,
      }}
    >
      {!isMine && (
        <div style={{ width: 32, flexShrink: 0 }}>
          {showAvatar && (
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: avatarColor(msg.sender_id),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 13,
                fontWeight: 700,
                color: '#fff',
              }}
            >
              {avatarInitial(msg.sender_nickname)}
            </div>
          )}
        </div>
      )}

      <div
        style={{
          maxWidth: '68%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: isMine ? 'flex-end' : 'flex-start',
        }}
      >
        {!isMine && showAvatar && (
          <span style={{ fontSize: 11, color: '#aeaeb2', marginBottom: 3, paddingLeft: 4 }}>{msg.sender_nickname}</span>
        )}

        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, flexDirection: isMine ? 'row-reverse' : 'row' }}>
          <motion.div
            initial={iosAnim ? { scaleX: 1.55 } : { scaleX: 1 }}
            animate={{ scaleX: 1 }}
            transition={iosAnim ? { type: 'spring', damping: 22, stiffness: 380, mass: 0.6 } : { duration: 0 }}
            style={{
              transformOrigin: isMine ? '100% 100%' : '0% 100%',
              padding: '9px 13px',
              borderRadius: isMine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
              background: isMine ? '#0071E3' : 'rgba(255,255,255,0.85)',
              border: isMine ? 'none' : '1px solid rgba(229,229,234,0.8)',
              backdropFilter: isMine ? 'none' : 'blur(8px)',
              WebkitBackdropFilter: isMine ? 'none' : 'blur(8px)',
              boxShadow: isMine ? '0 2px 12px rgba(0,113,227,0.25)' : '0 1px 4px rgba(0,0,0,0.06)',
              fontSize: 14,
              color: isMine ? '#fff' : '#1d1d1f',
              lineHeight: 1.55,
              wordBreak: 'break-word',
              whiteSpace: 'pre-wrap',
            }}
          >
            {displayContent}
            {isLong && (
              <div style={{ marginTop: 6 }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onFullView?.();
                  }}
                  style={{
                    display: 'inline-block',
                    background: isMine ? 'rgba(255,255,255,0.22)' : 'rgba(0,113,227,0.10)',
                    border: 'none',
                    borderRadius: 8,
                    padding: '3px 10px',
                    fontSize: 12,
                    fontWeight: 600,
                    color: isMine ? '#fff' : '#0071E3',
                    cursor: 'pointer',
                  }}
                >
                  전체보기 ▼
                </button>
              </div>
            )}
          </motion.div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: isMine ? 'flex-end' : 'flex-start',
              gap: 2,
              paddingBottom: 2,
              flexShrink: 0,
            }}
          >
            {isMine && unreadCount !== undefined && unreadCount > 0 && (
              <span style={{ fontSize: 10, fontWeight: 600, color: '#0071E3', lineHeight: 1 }}>{unreadCount}</span>
            )}
            <span style={{ fontSize: 10, color: '#aeaeb2' }}>{formatTime(msg.created_at)}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── 메시지 전체보기 모달 ─────────────────────────────────────────────────────

function MessageFullViewModal({
  msg,
  isMine,
  onClose,
}: {
  msg: ChatMessageResponse;
  isMine: boolean;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.35)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: FONT,
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 12 }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          flexShrink: 0,
          width: 640,
          height: 600,
          background: 'rgba(255, 255, 255, 0.84)',
          backdropFilter: 'blur(30px) saturate(1.8) brightness(1.05)',
          WebkitBackdropFilter: 'blur(30px) saturate(1.8) brightness(1.05)',
          border: '1px solid rgba(0, 0, 0, 0.12)',
          boxShadow: 'rgba(0, 0, 0, 0.11) 0px 10px 40px, rgba(255, 255, 255, 0.9) 0px 1px 0px, rgba(0, 0, 0, 0.07) 0px 0px 0px 1px inset',
          borderRadius: 20,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '18px 20px 14px',
            gap: 10,
            borderBottom: '1px solid rgba(0,0,0,0.07)',
          }}
        >
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: '50%',
              background: avatarColor(msg.sender_id),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 15,
              fontWeight: 700,
              color: '#fff',
              flexShrink: 0,
            }}
          >
            {avatarInitial(msg.sender_nickname)}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#1d1d1f' }}>
              {msg.sender_nickname}
              {isMine && <span style={{ fontSize: 11, color: '#aeaeb2', marginLeft: 5, fontWeight: 400 }}>나</span>}
            </div>
            <div style={{ fontSize: 11, color: '#aeaeb2', marginTop: 1 }}>
              {new Date(msg.created_at).toLocaleString('ko-KR', {
                month: 'long',
                day: 'numeric',
                weekday: 'short',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true,
              })}
            </div>
          </div>
          <button
            onClick={onClose}
            className="liquid"
            style={{
              width: 30,
              height: 30,
              borderRadius: '50%',
              border: 'none',
              cursor: 'pointer',
              fontSize: 16,
              color: '#6e6e73',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
            }}
          >
            ×
          </button>
        </div>
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px 24px 40px',
            fontSize: 15,
            color: '#1d1d1f',
            lineHeight: 1.7,
            wordBreak: 'break-word',
            whiteSpace: 'pre-wrap',
          }}
        >
          {msg.content}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── 공지사항 모달 ────────────────────────────────────────────────────────────

function NoticeFullViewModal({
  item,
  expandedH,
  bodyRef,
  onClose,
}: {
  item: { notice: string; groupTitle: string; dx: number; dy: number; fromW: number; fromH: number; toW: number; toH: number }
  expandedH: number | null
  bodyRef: React.RefObject<HTMLDivElement | null>
  onClose: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.14 }}
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.3)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: 24,
        fontFamily: FONT,
      }}
    >
      <motion.div
        initial={{ width: item.fromW, height: item.fromH, x: item.dx, y: item.dy, borderRadius: 8 }}
        animate={{ width: item.toW, height: expandedH ?? item.toH, x: 0, y: 0, borderRadius: 20 }}
        exit={{ width: item.fromW, height: item.fromH, x: item.dx, y: item.dy, borderRadius: 8, transition: { duration: 0.26, ease: [0.22, 1, 0.36, 1] } }}
        transition={{ type: 'spring', stiffness: 300, damping: 22, mass: 1 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'rgba(255, 255, 255, 0.84)',
          backdropFilter: 'blur(30px) saturate(1.8) brightness(1.05)',
          WebkitBackdropFilter: 'blur(30px) saturate(1.8) brightness(1.05)',
          border: '1px solid rgba(0, 0, 0, 0.12)',
          boxShadow: '0px 10px 40px rgba(0,0,0,0.11), 0px 1px 0px rgba(255,255,255,0.9), inset 0px 0px 0px 1px rgba(0,0,0,0.07)',
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        <motion.div
          initial={{ opacity: 0.3, filter: 'blur(8px)' }}
          animate={{ opacity: 1, filter: 'blur(0px)' }}
          exit={{ opacity: 0, filter: 'blur(8px)' }}
          transition={{ duration: 0.38, delay: 0.06, ease: 'easeOut' }}
          style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}
        >
          {/* 헤더 */}
          <div style={{
            position: 'relative',
            padding: '26px 26px 22px',
            background: 'linear-gradient(145deg, rgba(0,113,227,0.11) 0%, rgba(0,113,227,0.04) 60%, rgba(255,255,255,0) 100%)',
            borderBottom: '1px solid rgba(0,113,227,0.1)',
            overflow: 'hidden',
            flexShrink: 0,
          }}>
            <div style={{ position: 'absolute', top: -50, right: -50, width: 180, height: 180, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,113,227,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: -20, right: 60, width: 80, height: 80, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,113,227,0.07) 0%, transparent 70%)', pointerEvents: 'none' }} />
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <div style={{ width: 4, height: 16, borderRadius: 2, background: 'linear-gradient(180deg, #0071E3, #4DA3FF)' }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#0071E3', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Notice</span>
                </div>
                <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1d1d1f', letterSpacing: '-0.04em', margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.groupTitle}
                </h2>
                <span style={{ fontSize: 12, color: '#aeaeb2' }}>공지사항 전체 내용</span>
              </div>
            </div>
          </div>

          {/* 본문 */}
          <div ref={bodyRef} style={{ flex: 1, overflowY: 'auto', padding: '24px 26px', background: 'rgba(248, 248, 250, 0.5)' }}>
            <div style={{ position: 'relative', background: 'rgba(255, 255, 255, 0.7)', borderLeft: '4px solid #0071E3', borderRadius: '0 12px 12px 0', padding: '18px 20px', boxShadow: 'inset 1px 1px 0 rgba(255,255,255,0.65), inset 0 0 6px rgba(255,255,255,0.25), 0 2px 8px rgba(0,0,0,0.05)' }}>
              <p style={{ fontSize: 14.5, color: '#1d1d1f', lineHeight: 1.9, whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0 }}>
                {item.notice}
              </p>
            </div>
          </div>

          {/* 푸터 */}
          <div style={{ padding: '14px 26px', borderTop: '1px solid rgba(0,0,0,0.07)', background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'flex-end', flexShrink: 0 }}>
            <button
              onClick={onClose}
              className="liquid liquid-action"
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 20px', borderRadius: 12, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', letterSpacing: '-0.01em', fontFamily: 'inherit' }}
            >
              확인
            </button>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

function NoticeEditModal({
  item,
  initial,
  onSave,
  onCancel,
}: {
  item: { dx: number; dy: number; fromW: number; fromH: number; toW: number; toH: number }
  initial: string;
  onSave: (t: string) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(initial);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.14 }}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.3)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: 24,
        fontFamily: FONT,
      }}
    >
      <motion.div
        initial={{ width: item.fromW, height: item.fromH, x: item.dx, y: item.dy, borderRadius: 8 }}
        animate={{ width: item.toW, height: item.toH, x: 0, y: 0, borderRadius: 20 }}
        exit={{ width: item.fromW, height: item.fromH, x: item.dx, y: item.dy, borderRadius: 8, transition: { duration: 0.26, ease: [0.22, 1, 0.36, 1] } }}
        transition={{ type: 'spring', stiffness: 300, damping: 22, mass: 1 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'rgba(255, 255, 255, 0.84)',
          backdropFilter: 'blur(30px) saturate(1.8) brightness(1.05)',
          WebkitBackdropFilter: 'blur(30px) saturate(1.8) brightness(1.05)',
          border: '1px solid rgba(0, 0, 0, 0.12)',
          boxShadow: '0px 10px 40px rgba(0,0,0,0.11), 0px 1px 0px rgba(255,255,255,0.9), inset 0px 0px 0px 1px rgba(0,0,0,0.07)',
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        <motion.div
          initial={{ opacity: 0.3, filter: 'blur(8px)' }}
          animate={{ opacity: 1, filter: 'blur(0px)' }}
          exit={{ opacity: 0, filter: 'blur(8px)' }}
          transition={{ duration: 0.38, delay: 0.06, ease: 'easeOut' }}
          style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}
        >
          {/* 헤더 */}
          <div style={{
            position: 'relative',
            padding: '26px 26px 22px',
            background: 'linear-gradient(145deg, rgba(0,113,227,0.11) 0%, rgba(0,113,227,0.04) 60%, rgba(255,255,255,0) 100%)',
            borderBottom: '1px solid rgba(0,113,227,0.1)',
            overflow: 'hidden',
            flexShrink: 0,
          }}>
            <div style={{ position: 'absolute', top: -50, right: -50, width: 180, height: 180, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,113,227,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: -20, right: 60, width: 80, height: 80, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,113,227,0.07) 0%, transparent 70%)', pointerEvents: 'none' }} />
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <div style={{ width: 4, height: 16, borderRadius: 2, background: 'linear-gradient(180deg, #0071E3, #4DA3FF)' }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#0071E3', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Notice</span>
                </div>
                <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1d1d1f', letterSpacing: '-0.04em', margin: '0 0 4px' }}>
                  공지 편집
                </h2>
                <span style={{ fontSize: 12, color: '#aeaeb2' }}>공지사항을 수정하세요</span>
              </div>
            </div>
          </div>

          {/* 본문 */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px 26px', background: 'rgba(248, 248, 250, 0.5)', minHeight: 0 }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', background: 'rgba(255, 255, 255, 0.7)', borderLeft: '4px solid #0071E3', borderRadius: '0 12px 12px 0', padding: '18px 20px', boxShadow: 'inset 1px 1px 0 rgba(255,255,255,0.65), inset 0 0 6px rgba(255,255,255,0.25), 0 2px 8px rgba(0,0,0,0.05)', minHeight: 0 }}>
              <textarea
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="공지사항을 입력하세요..."
                style={{
                  flex: 1,
                  width: '100%',
                  border: 'none',
                  padding: 0,
                  fontSize: 14.5,
                  color: '#1d1d1f',
                  lineHeight: 1.9,
                  resize: 'none',
                  outline: 'none',
                  fontFamily: FONT,
                  boxSizing: 'border-box',
                  background: 'transparent',
                  wordBreak: 'break-word',
                  overflowY: 'auto',
                }}
              />
            </div>
          </div>

          {/* 푸터 */}
          <div style={{ padding: '14px 26px', borderTop: '1px solid rgba(0,0,0,0.07)', background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'flex-end', gap: 8, flexShrink: 0 }}>
            <button
              onClick={onCancel}
              className="liquid"
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 20px', borderRadius: 12, border: 'none', color: '#6e6e73', fontSize: 13, fontWeight: 600, cursor: 'pointer', letterSpacing: '-0.01em', fontFamily: FONT }}
            >
              취소
            </button>
            <button
              onClick={() => onSave(draft)}
              className="liquid liquid-action"
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 20px', borderRadius: 12, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', letterSpacing: '-0.01em', fontFamily: FONT }}
            >
              저장
            </button>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

// ─── 좌측 채팅방 목록 스켈레톤 ──────────────────────────────────────────────

function ChatRoomListSkeleton() {
  return (
    <>
      <style>{SHIMMER_STYLE}</style>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, padding: '4px 0' }}>
        {[80, 140, 110, 95, 130].map((titleW, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 10px',
              borderRadius: 12,
            }}
          >
            <div
              className="chat-skeleton-shimmer"
              style={{ width: 40, height: 40, borderRadius: 11, flexShrink: 0 }}
            />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="chat-skeleton-shimmer" style={{ width: titleW, height: 12, borderRadius: 6 }} />
                <div className="chat-skeleton-shimmer" style={{ width: 28, height: 10, borderRadius: 5 }} />
              </div>
              <div className="chat-skeleton-shimmer" style={{ width: '70%', height: 10, borderRadius: 5 }} />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// ─── 좌측 채팅방 목록 사이드바 ───────────────────────────────────────────────

function ChatListSidebar({
  rooms,
  currentGroupId,
  onSelect,
  user,
  loading,
}: {
  rooms: ChatRoomListItem[];
  currentGroupId: number;
  onSelect: (groupId: number) => void;
  user: { id: number; nickname: string; email?: string } | null;
  loading: boolean;
}) {
  const sorted = [...rooms].sort((a, b) => {
    if (!a.last_message_at && !b.last_message_at) return 0;
    if (!a.last_message_at) return 1;
    if (!b.last_message_at) return -1;
    return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime();
  });

  const avatarLetter = (user?.nickname ?? '?').charAt(0).toUpperCase();
  const userColor = user ? avatarColor(user.id) : '#6e6e73';

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 헤더 타이틀 */}
      <div style={{ padding: '20px 16px 12px', flexShrink: 0 }}>
        <p
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: 'rgba(0,0,0,0.35)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            margin: '0 0 4px',
          }}
        >
          Study Hub
        </p>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1d1d1f', letterSpacing: '-0.03em', margin: 0 }}>채팅</h2>
      </div>

      {/* 구분선 */}
      <div style={{ height: 1, background: 'rgba(0,0,0,0.07)', margin: '0 12px 8px', flexShrink: 0 }} />

      {/* 채팅방 목록 — 스크롤 가능 영역 */}
      <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
        <div style={{ height: '100%', overflowY: 'auto', padding: '4px 8px' }}>
          {loading ? (
            <ChatRoomListSkeleton />
          ) : sorted.length === 0 ? (
            <div style={{ padding: '24px 8px', textAlign: 'center', color: '#aeaeb2', fontSize: 12 }}>
              참여 중인 채팅방이 없습니다
            </div>
          ) : (
            sorted.map((room, i) => {
              const active = room.group_id === currentGroupId;
              return (
                <motion.button
                  key={room.group_id}
                  onClick={() => onSelect(room.group_id)}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.28, delay: i * 0.04, ease: [0.22, 1, 0.36, 1] }}
                  whileHover={!active ? { scale: 1.02, x: 2 } : {}}
                  whileTap={{ scale: 0.97 }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 10px',
                    borderRadius: 12,
                    marginBottom: 3,
                    background: active ? 'rgba(255,255,255,0.88)' : 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontFamily: FONT,
                    boxShadow: active
                      ? '0 2px 8px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.8)'
                      : room.is_leader
                        ? 'inset 0 0 0 1px rgba(0,113,227,0.18)'
                        : 'none',
                    transition: 'background 0.18s',
                    position: 'relative',
                  }}
                >
                  {/* 아바타 */}
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 11,
                      background: avatarColorFromGroupId(room.group_id),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 16,
                      fontWeight: 700,
                      color: '#fff',
                      flexShrink: 0,
                      boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                    }}
                  >
                    {avatarInitial(room.group_title)}
                  </div>

                  {/* 텍스트 */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 4,
                        marginBottom: 2,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: active ? 600 : 500,
                          color: active ? '#0071E3' : '#1d1d1f',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          flex: 1,
                        }}
                      >
                        {room.group_title}
                      </span>
                      {room.last_message_at && (
                        <span style={{ fontSize: 10, color: '#aeaeb2', flexShrink: 0 }}>
                          {formatChatTime(room.last_message_at)}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
                      <span
                        style={{
                          fontSize: 11,
                          color: '#aeaeb2',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          flex: 1,
                        }}
                      >
                        {room.last_message ?? `멤버 ${room.member_count}명`}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                        {room.is_leader && (
                          <span style={{
                            fontSize: 9,
                            fontWeight: 600,
                            color: '#0071E3',
                            background: 'rgba(0,113,227,0.08)',
                            border: '1px solid rgba(0,113,227,0.2)',
                            borderRadius: 999,
                            padding: '1px 5px',
                          }}>
                            조장
                          </span>
                        )}
                        {room.unread_count > 0 && (
                          <span
                            style={{
                              minWidth: 18,
                              height: 18,
                              borderRadius: 9,
                              background: '#ff3b30',
                              color: '#fff',
                              fontSize: 10,
                              fontWeight: 700,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: '0 4px',
                            }}
                          >
                            {room.unread_count > 99 ? '99+' : room.unread_count}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.button>
              );
            })
          )}
        </div>
        {/* 채팅방 목록 하단 그라데이션 오버레이 */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 24,
            background: 'linear-gradient(to bottom, transparent, rgba(240,240,245,0.7))',
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* 계정 정보 — 컨테이너 하단 고정 */}
      <div
        style={{
          height: 72,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          padding: '0 12px',
          gap: 10,
          borderTop: '1px solid rgba(0,0,0,0.06)',
          background: 'rgba(235,235,242,0.98)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: userColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 13,
            fontWeight: 700,
            color: '#fff',
            flexShrink: 0,
            boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
          }}
        >
          {avatarLetter}
        </div>
        <div style={{ minWidth: 0 }}>
          <p
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: '#1d1d1f',
              margin: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {user?.nickname ?? '...'}
          </p>
          {user?.email && (
            <p
              style={{
                fontSize: 10,
                color: '#aeaeb2',
                margin: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {user.email}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── 우측 멤버/공지 패널 ──────────────────────────────────────────────────────

function RightPanel({
  roomInfo,
  noticeText,
  isLeader,
  user,
  onEditNotice,
  onDeleteNotice,
  onFullViewNotice,
}: {
  roomInfo: ChatRoomInfoResponse | null;
  noticeText: string;
  isLeader: boolean;
  user: { id: number; nickname: string } | null;
  onEditNotice: (rect: DOMRect) => void;
  onDeleteNotice: () => void;
  onFullViewNotice: (rect: DOMRect) => void;
}) {
  const [noticeExpanded, setNoticeExpanded] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const noticeAreaRef = useRef<HTMLDivElement | null>(null);
  const editButtonRef = useRef<HTMLButtonElement | null>(null);
  const [isClamped, setIsClamped] = useState(false);

  useLayoutEffect(() => {
    setNoticeExpanded(false);
  }, [noticeText]);
  useLayoutEffect(() => {
    const el = contentRef.current;
    if (!el || noticeExpanded) return;
    setIsClamped(el.scrollHeight > el.clientHeight + 1);
  }, [noticeText, noticeExpanded]);

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '20px 14px' }}>
      {/* 공지 */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <p
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: 'rgba(0,0,0,0.35)',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              margin: 0,
            }}
          >
            공지
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            {isLeader && (
              <button
                ref={editButtonRef}
                onClick={() => {
                  const rect = editButtonRef.current?.getBoundingClientRect();
                  if (rect) onEditNotice(rect);
                }}
                style={{
                  fontSize: 10,
                  color: '#aeaeb2',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                {noticeText.trim() ? '수정' : '추가'}
              </button>
            )}
            {isLeader && noticeText.trim() && (
              <button
                onClick={onDeleteNotice}
                style={{
                  fontSize: 10,
                  color: '#ff3b30',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                삭제
              </button>
            )}
          </div>
        </div>
        {noticeText.trim() ? (
          <div ref={noticeAreaRef}>
            <div
              ref={contentRef}
              style={{
                fontSize: 12,
                color: '#3a2010',
                lineHeight: 1.55,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                background: 'rgba(255,248,240,0.85)',
                borderRadius: 10,
                padding: '8px 10px',
                overflow: 'hidden',
                display: '-webkit-box',
                WebkitBoxOrient: 'vertical',
                WebkitLineClamp: noticeExpanded ? 7 : 2,
              }}
            >
              {noticeText}
            </div>
            {isClamped && (
              <div style={{ display: 'flex', gap: 8, marginTop: 5, justifyContent: 'space-between' }}>
                <button
                  onClick={() => setNoticeExpanded((v) => !v)}
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: '#0071E3',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  {noticeExpanded ? '접기 ▲' : '펼치기 ▼'}
                </button>
                <button
                  onClick={() => {
                    const rect = noticeAreaRef.current?.getBoundingClientRect();
                    if (rect) onFullViewNotice(rect);
                  }}
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: '#0071E3',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  전체보기
                </button>
              </div>
            )}
          </div>
        ) : (
          <p style={{ fontSize: 12, color: '#c7c7cc', margin: 0, textAlign: 'center', padding: '6px 0' }}>
            {isLeader ? '추가 버튼으로 공지를 등록하세요' : '등록된 공지가 없습니다'}
          </p>
        )}
      </div>

      <div style={{ height: 1, background: 'rgba(0,0,0,0.07)', marginBottom: 16 }} />

      {/* 멤버 목록 */}
      <div>
        <p
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: 'rgba(0,0,0,0.35)',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            margin: '0 0 10px',
          }}
        >
          멤버 ({roomInfo?.members.length ?? 0})
        </p>
        {roomInfo?.members.map((m) => (
          <div key={m.user_id} style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: avatarColor(m.user_id),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                fontWeight: 700,
                color: '#fff',
                flexShrink: 0,
              }}
            >
              {avatarInitial(m.nickname)}
            </div>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#1d1d1f',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {m.nickname}
                {m.user_id === user?.id && <span style={{ fontSize: 10, color: '#aeaeb2', marginLeft: 4 }}>나</span>}
              </div>
              {m.is_leader && <div style={{ fontSize: 10, color: '#0071E3', fontWeight: 600 }}>조장</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── GroupChatPage ─────────────────────────────────────────────────────────────

export default function GroupChatPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { showAlert, showConfirm } = useAlert();
  const groupId = Number(id);

  const fromState = (location.state as { from?: string } | null)?.from;
  const backPath: string = fromState ?? `/groups/${id}`;
  const backLabel =
    fromState === '/notifications' ? '알림' :
    fromState === '/chats' ? '채팅 목록' :
    '그룹 상세';

  // ── 채팅방 목록 (좌측 사이드바용) ────────────────────────────────────────
  const [chatRooms, setChatRooms] = useState<ChatRoomListItem[]>([]);

  // ── 채팅 상태 ─────────────────────────────────────────────────────────────
  const [roomInfo, setRoomInfo] = useState<ChatRoomInfoResponse | null>(null);
  const [messages, setMessages] = useState<ChatMessageResponse[]>([]);
  const [systemMessages, setSystemMessages] = useState<{ key: string; content: string }[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [input, setInput] = useState('');
  const [wsState, setWsState] = useState<'connecting' | 'open' | 'closed'>('connecting');

  // ── 우측 패널 상태 ────────────────────────────────────────────────────────
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);

  // ── 화면 너비 감지 (반응형) ───────────────────────────────────────────────
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  useEffect(() => {
    const handler = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  const isNarrow = windowWidth < 900;
  const isVeryNarrow = windowWidth < 640;

  // 좁아질 때 자동으로 우측 패널 닫기
  useEffect(() => {
    if (isNarrow) setIsRightPanelOpen(false);
    else setIsRightPanelOpen(true);
  }, [isNarrow]);

  // ── 애니메이션 / 전송 관련 ────────────────────────────────────────────────
  const [animatingMsgIds, setAnimatingMsgIds] = useState<Set<number>>(new Set());
  const [isBubbleAnimating, setIsBubbleAnimating] = useState(false);
  const [sessionMsgIds, setSessionMsgIds] = useState<Set<number>>(new Set());

  // ── 모달 상태 ─────────────────────────────────────────────────────────────
  const [fullViewMsg, setFullViewMsg] = useState<ChatMessageResponse | null>(null);
  const [noticeText, setNoticeText] = useState('');
  const [noticeFullViewItem, setNoticeFullViewItem] = useState<{
    notice: string; groupTitle: string
    dx: number; dy: number; fromW: number; fromH: number; toW: number; toH: number
  } | null>(null);
  const [noticeExpandedH, setNoticeExpandedH] = useState<number | null>(null);
  const [noticeEditItem, setNoticeEditItem] = useState<{
    dx: number; dy: number; fromW: number; fromH: number; toW: number; toH: number
  } | null>(null);
  const [noticeBarExpanded, setNoticeBarExpanded] = useState(false);
  const [noticeBarClamped, setNoticeBarClamped] = useState(false);
  const [noticeBarExceedsThree, setNoticeBarExceedsThree] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const inputBarRef = useRef<HTMLDivElement | null>(null);
  const noticeBarTextRef = useRef<HTMLSpanElement | null>(null);
  const noticeBarBoxRef = useRef<HTMLDivElement | null>(null);
  const noticeModalBodyRef = useRef<HTMLDivElement | null>(null);
  const isSendingRef = useRef(false);
  const lastSentContentRef = useRef<string | null>(null);
  const animOriginYRef = useRef<number>(72);
  const isAnimatingRef = useRef(false);

  // ── 채팅방 목록 로드 ──────────────────────────────────────────────────────
  const [chatRoomsLoading, setChatRoomsLoading] = useState(true);
  useEffect(() => {
    api.get('/my/chats').then(async (res) => {
      if (res.ok) {
        const rooms: ChatRoomListItem[] = await res.json();
        setChatRooms(rooms.map((r) => (r.group_id === groupId ? { ...r, unread_count: 0 } : r)));
      }
    }).finally(() => setChatRoomsLoading(false));
  }, [groupId]);

  // 채팅방 전환 시 즉시 unread_count 초기화
  useEffect(() => {
    setChatRooms((prev) =>
      prev.map((r) => (r.group_id === groupId ? { ...r, unread_count: 0 } : r)),
    );
  }, [groupId]);

  // ── 채팅방 초기 정보 ──────────────────────────────────────────────────────
  const fetchRoomInfo = useCallback(async () => {
    const res = await api.get(`/groups/${groupId}/chat/info`);
    if (!res.ok) {
      if (res.status === 403) {
        showAlert('채팅방은 확정된 멤버만 입장할 수 있습니다.', 'error');
        navigate(backPath);
      } else if (res.status === 404) {
        navigate('/groups');
      }
      return;
    }
    setRoomInfo(await res.json());
  }, [groupId, navigate, showAlert, backPath]);

  const fetchHistory = useCallback(
    async (beforeId?: number) => {
      setLoadingHistory(true);
      try {
        const params = beforeId ? `?limit=50&before_id=${beforeId}` : '?limit=50';
        const res = await api.get(`/groups/${groupId}/chat/messages${params}`);
        if (!res.ok) return;
        const data = await res.json();
        if (beforeId) {
          setMessages((prev) => [...data.messages, ...prev]);
        } else {
          setMessages(data.messages);
          setInitialLoading(false);
        }
        setHasMore(data.has_more);
      } finally {
        setLoadingHistory(false);
      }
    },
    [groupId],
  );

  const markRead = useCallback(
    async (lastMsgId: number) => {
      await api.post(`/groups/${groupId}/chat/read?last_message_id=${lastMsgId}`);
      setChatRooms((prev) =>
        prev.map((r) => (r.group_id === groupId ? { ...r, unread_count: 0 } : r)),
      );
    },
    [groupId],
  );

  const connectWs = useCallback(() => {
    const token = localStorage.getItem('access_token');
    if (!token) return;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/v1/groups/${groupId}/chat/ws?token=${encodeURIComponent(token)}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    setWsState('connecting');

    ws.onopen = () => setWsState('open');
    ws.onmessage = (e) => {
      try {
        const payload: WsMessagePayload = JSON.parse(e.data);
        if (payload.type === 'system' && payload.content) {
          const key = `sys-${Date.now()}-${Math.random()}`;
          setSystemMessages((prev) => [...prev, { key, content: payload.content! }]);
          return;
        }
        if (payload.type === 'message' && payload.id) {
          const msg: ChatMessageResponse = {
            id: payload.id,
            group_id: payload.group_id!,
            sender_id: payload.sender_id!,
            sender_nickname: payload.sender_nickname!,
            content: payload.content!,
            created_at: payload.created_at!,
          };
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
          // 채팅 목록의 마지막 메시지 및 시간 즉시 업데이트
          setChatRooms((prev) =>
            prev.map((r) =>
              r.group_id === groupId
                ? { ...r, last_message: msg.content, last_message_at: msg.created_at, unread_count: 0 }
                : r,
            ),
          );
          if (msg.sender_id === user?.id) {
            if (lastSentContentRef.current !== null && lastSentContentRef.current === msg.content) {
              setAnimatingMsgIds((prev) => new Set([...prev, msg.id]));
              lastSentContentRef.current = null;
            }
            setSessionMsgIds((prev) => new Set([...prev, msg.id]));
            markRead(msg.id);
          }
        }
      } catch {
        /* ignore */
      }
    };
    ws.onclose = () => setWsState('closed');
    ws.onerror = () => setWsState('closed');
  }, [groupId, user?.id, markRead]);

  useEffect(() => {
    fetchRoomInfo();
    fetchHistory();
    connectWs();
    return () => {
      wsRef.current?.close();
    };
  }, [fetchRoomInfo, fetchHistory, connectWs]);

  useEffect(() => {
    const stored = localStorage.getItem(`chatNotice_${groupId}`);
    if (stored?.trim()) setNoticeText(stored.trim());
    else if (roomInfo?.notice?.trim()) setNoticeText(roomInfo.notice);
    else setNoticeText('');
  }, [groupId, roomInfo]);

  useLayoutEffect(() => {
    setNoticeBarExpanded(false);
    setNoticeBarExceedsThree(false);
  }, [noticeText]);

  useLayoutEffect(() => {
    const el = noticeBarTextRef.current;
    if (!el) return;
    if (!noticeBarExpanded) {
      // line-clamp을 잠시 해제해 실제 콘텐츠 높이 측정
      ;(el.style as any).webkitLineClamp = 'unset';
      const fullHeight = el.clientHeight;
      ;(el.style as any).webkitLineClamp = '1';
      const lineHeight = parseFloat(getComputedStyle(el).lineHeight) || 18;
      setNoticeBarClamped(fullHeight > lineHeight * 1.5);
    } else {
      setNoticeBarExceedsThree(el.scrollHeight > el.clientHeight + 1);
    }
  }, [noticeText, noticeBarExpanded, windowWidth]);

  const saveNotice = useCallback(
    (text: string) => {
      setNoticeText(text);
      if (text.trim()) localStorage.setItem(`chatNotice_${groupId}`, text.trim());
      else localStorage.removeItem(`chatNotice_${groupId}`);
      setNoticeEditItem(null);
    },
    [groupId],
  );

  const openNoticeEdit = useCallback((rect: DOMRect) => {
    const toW = Math.min(window.innerWidth - 32, 640);
    const toH = window.innerHeight - 80 * 2;
    setNoticeEditItem({
      dx: (rect.left + rect.width / 2) - window.innerWidth / 2,
      dy: (rect.top + rect.height / 2) - window.innerHeight / 2,
      fromW: rect.width,
      fromH: rect.height,
      toW,
      toH,
    });
  }, []);

  const openNoticeFullView = useCallback((rect: DOMRect) => {
    const toW = Math.min(window.innerWidth - 32, 640);
    const toH = Math.min(window.innerHeight * 0.8, 600);
    setNoticeFullViewItem({
      notice: noticeText,
      groupTitle: roomInfo?.group_title ?? '채팅방',
      dx: (rect.left + rect.width / 2) - window.innerWidth / 2,
      dy: (rect.top + rect.height / 2) - window.innerHeight / 2,
      fromW: rect.width,
      fromH: rect.height,
      toW,
      toH,
    });
  }, [noticeText, roomInfo?.group_title]);

  useEffect(() => {
    if (noticeFullViewItem || noticeEditItem) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [noticeFullViewItem, noticeEditItem]);


  useEffect(() => {
    if (!noticeFullViewItem) { setNoticeExpandedH(null); return; }
    const HEADER_H = 80;
    const MAX_H = window.innerHeight - HEADER_H * 2;
    const timer = setTimeout(() => {
      const body = noticeModalBodyRef.current;
      if (!body || body.scrollHeight <= body.clientHeight) return;
      const overflow = body.scrollHeight - body.clientHeight;
      const newH = Math.min(noticeFullViewItem.toH + overflow + 48, MAX_H);
      if (newH > noticeFullViewItem.toH) setNoticeExpandedH(newH);
    }, 400);
    return () => clearTimeout(timer);
  }, [noticeFullViewItem]);

  const isLeader = roomInfo?.members.find((m) => m.user_id === user?.id)?.is_leader ?? false;
  const memberCount = roomInfo?.members.length ?? 0;

  useEffect(() => {
    if (messages.length > 0 && !loadingHistory) {
      const list = listRef.current;
      if (list && list.scrollTop === 0) bottomRef.current?.scrollIntoView();
    }
  }, [messages.length, loadingHistory]);

  const prevLengthRef = useRef(0);
  useEffect(() => {
    const last = messages[messages.length - 1];
    if (messages.length > prevLengthRef.current && last) {
      const list = listRef.current;
      const isNearBottom = list ? list.scrollHeight - list.scrollTop - list.clientHeight < 120 : true;
      if (last.sender_id === user?.id || isNearBottom) {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        markRead(last.id);
      }
    }
    prevLengthRef.current = messages.length;
  }, [messages, user?.id, markRead]);

  const handleScroll = () => {
    const list = listRef.current;
    if (!list) return;
    if (list.scrollTop < 60 && hasMore && !loadingHistory) {
      const firstId = messages[0]?.id;
      const prevHeight = list.scrollHeight;
      fetchHistory(firstId).then(() => {
        requestAnimationFrame(() => {
          list.scrollTop = list.scrollHeight - prevHeight;
        });
      });
    }
  };

  const clearAnimation = useCallback((msgId: number) => {
    setAnimatingMsgIds((prev) => {
      const n = new Set(prev);
      n.delete(msgId);
      return n;
    });
    isAnimatingRef.current = false;
    setIsBubbleAnimating(false);
  }, []);

  const sendMessage = () => {
    if (isSendingRef.current || isAnimatingRef.current) return;
    const content = input.trim();
    if (!content) return;
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      showAlert('연결이 끊겼습니다. 페이지를 새로고침해 주세요.', 'error');
      return;
    }
    lastSentContentRef.current = content;
    animOriginYRef.current = (inputBarRef.current?.offsetHeight ?? 72) + 8;
    isAnimatingRef.current = true;
    setIsBubbleAnimating(true);
    setTimeout(() => {
      if (isAnimatingRef.current) {
        isAnimatingRef.current = false;
        setIsBubbleAnimating(false);
      }
    }, 3000);
    isSendingRef.current = true;
    wsRef.current.send(JSON.stringify({ content }));
    setInput('');
    inputRef.current?.focus();
    requestAnimationFrame(() => {
      isSendingRef.current = false;
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      sendMessage();
    }
  };

  const reconnect = () => {
    wsRef.current?.close();
    connectWs();
  };

  const handleRoomSelect = (gId: number) => {
    if (gId === groupId) return;
    navigate(`/groups/${gId}/chat`, { state: { from: '/chats' } });
  };

  const handleLeaveChat = async () => {
    const confirmed = await showConfirm(
      '채팅방을 나가면 스터디 그룹에서 영구 탈퇴됩니다. 계속하시겠습니까?',
    );
    if (!confirmed) return;

    const res = await api.delete(`/groups/${groupId}/chat/leave`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      showAlert(err.detail ?? '탈퇴 처리에 실패했습니다.', 'error');
      return;
    }

    wsRef.current?.close();
    navigate(backPath);
  };

  // 좌측 사이드바 너비
  const leftW = isVeryNarrow ? 0 : 220;
  // 우측 패널 너비
  const rightW = 220;

  return (
    <div style={{ height: '100dvh', display: 'flex', background: '#f0f0f5', fontFamily: FONT, overflow: 'hidden' }}>
      {/* ══ 좌측: 채팅방 목록 (Apple Music 스타일 liquid glass 사이드바) ══════ */}
      <AnimatePresence initial={false}>
        {!isVeryNarrow && (
          <motion.div
            key="left-sidebar"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: leftW, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            style={{ flexShrink: 0, overflow: 'hidden', height: '100dvh' }}
          >
            <div style={{ width: leftW, height: '100%', padding: '8px 6px 8px', boxSizing: 'border-box' }}>
              <LiquidGlassBase
                borderRadius={18}
                blur={28}
                tint="rgba(10,10,20,0.04)"
                withDistortion={false}
                style={{
                  height: '100%',
                  border: '0.5px solid rgba(255,255,255,0.45)',
                  boxShadow: '0 4px 28px rgba(0,0,0,0.10), 0 1px 0 rgba(255,255,255,0.7)',
                  overflow: 'hidden',
                }}
              >
                <ChatListSidebar rooms={chatRooms} currentGroupId={groupId} onSelect={handleRoomSelect} user={user} loading={chatRoomsLoading} />
              </LiquidGlassBase>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══ 가운데: 메인 채팅 영역 ═══════════════════════════════════════════ */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        {/* ── 상단 헤더 (liquid glass 플레이어 바 느낌) ── */}
        <div
          style={{
            height: 56,
            flexShrink: 0,
            background: 'rgba(255,255,255,0.75)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            borderBottom: '1px solid rgba(255,255,255,0.6)',
            boxShadow: '0 1px 12px rgba(0,0,0,0.06)',
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            padding: '0 16px',
            gap: 10,
          }}
        >
          {/* 뒤로가기 버튼 */}
          <motion.button
            onClick={() => navigate(backPath)}
            whileHover={{ x: -2 }}
            whileTap={{ scale: 0.9 }}
            title={backLabel}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px 6px',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              color: '#6e6e73',
              flexShrink: 0,
              minWidth: 76,
            }}
          >
            <svg width="9" height="15" viewBox="0 0 9 15" fill="none">
              <path d="M8 1L1.5 7.5L8 14" stroke="#6e6e73" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span style={{ fontSize: 13, fontWeight: 500, color: '#6e6e73', letterSpacing: '-0.01em' }}>
              {backLabel}
            </span>
          </motion.button>

          {/* 채팅방 아바타 + 타이틀 */}
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 9,
              flexShrink: 0,
              background: avatarColorFromGroupId(groupId),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
              fontWeight: 700,
              color: '#fff',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            }}
          >
            {roomInfo?.group_title ? avatarInitial(roomInfo.group_title) : '?'}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: '#1d1d1f',
                letterSpacing: '-0.02em',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {roomInfo?.group_title ?? '채팅방'}
            </div>
            <div style={{ fontSize: 10, color: '#aeaeb2', marginTop: 1 }}>
              {roomInfo ? `멤버 ${roomInfo.members.length}명` : '로딩 중...'}
            </div>
          </div>

          {/* WS 상태 표시 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: wsState === 'open' ? '#34C759' : wsState === 'connecting' ? '#005BBB' : '#ff3b30',
                transition: 'background 0.3s',
              }}
            />
            {wsState === 'closed' && (
              <motion.button
                onClick={reconnect}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                style={{
                  fontSize: 11,
                  color: '#0071E3',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                재연결
              </motion.button>
            )}
          </div>

          {/* 채팅방 나가기 버튼 — 호버 시 활성화 */}
          <motion.button
            onClick={handleLeaveChat}
            whileHover={{
              scale: 1.06,
              background: 'rgba(255,59,48,0.08)',
              border: '1px solid rgba(255,59,48,0.2)',
              boxShadow: '0 2px 10px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.6)',
            }}
            whileTap={{ scale: 0.92 }}
            title="채팅방 나가기"
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'transparent',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '1px solid transparent',
              boxShadow: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              transition: 'background 0.2s, border 0.2s, box-shadow 0.2s',
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="#ff3b30" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <polyline points="16 17 21 12 16 7" stroke="#ff3b30" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <line x1="21" y1="12" x2="9" y2="12" stroke="#ff3b30" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </motion.button>

          {/* 우측 패널 토글 (햄버거) */}
          <motion.button
            onClick={() => setIsRightPanelOpen((v) => !v)}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.92 }}
            title="멤버 목록"
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: isRightPanelOpen ? 'rgba(0,113,227,0.15)' : 'rgba(255,255,255,0.72)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: isRightPanelOpen ? '1px solid rgba(0,113,227,0.35)' : '1px solid rgba(200,200,210,0.55)',
              boxShadow: '0 2px 10px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.6)',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              padding: 0,
              flexShrink: 0,
            }}
          >
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  height: 1.5,
                  borderRadius: 1,
                  width: i === 2 ? 11 : 15,
                  background: isRightPanelOpen ? '#0071E3' : '#1d1d1f',
                  transition: 'background 0.2s, width 0.2s',
                }}
              />
            ))}
          </motion.button>
        </div>

        {/* ── 공지사항 바 ── */}
        <AnimatePresence>
          {noticeText.trim() && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              style={{ overflow: 'hidden', flexShrink: 0 }}
            >
              <div
                ref={noticeBarBoxRef}
                style={{
                  background: 'rgba(255,248,240,0.92)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  borderBottom: '1px solid rgba(0,113,227,0.15)',
                  padding: '7px 16px',
                  display: 'flex',
                  alignItems: noticeBarExpanded ? 'flex-start' : 'center',
                  gap: 7,
                }}
              >
                <span style={{ fontSize: 12, flexShrink: 0, lineHeight: '1.5', paddingTop: noticeBarExpanded ? 1 : 0 }}>📢</span>
                <span
                  ref={noticeBarTextRef}
                  style={{
                    fontSize: 12,
                    color: '#3a2010',
                    flex: 1,
                    overflow: 'hidden',
                    lineHeight: 1.5,
                    wordBreak: 'break-word',
                    ...(noticeBarExpanded
                      ? { display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 3, whiteSpace: 'pre-wrap' }
                      : { display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 1, textOverflow: 'ellipsis', whiteSpace: 'pre-wrap' }),
                  }}
                >
                  {noticeText}
                </span>
                {noticeBarClamped && (
                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignSelf: 'stretch', flexShrink: 0, gap: 4 }}>
                    <button
                      onClick={() => setNoticeBarExpanded((v) => !v)}
                      style={{ fontSize: 11, color: '#0071E3', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0, whiteSpace: 'nowrap' }}
                    >
                      {noticeBarExpanded ? '접기 ▲' : '펼치기 ▼'}
                    </button>
                    {noticeBarExpanded && noticeBarExceedsThree && (
                      <button
                        onClick={() => {
                          const rect = noticeBarBoxRef.current?.getBoundingClientRect();
                          if (rect) openNoticeFullView(rect);
                        }}
                        style={{ fontSize: 11, color: '#0071E3', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0, whiteSpace: 'nowrap', marginTop: 'auto' }}
                      >
                        전체보기
                      </button>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── 메시지 영역 ── */}
        <div
          ref={listRef}
          onScroll={handleScroll}
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px 20px 0',
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
          }}
        >
          {initialLoading && <ChatMessagesSkeleton />}

          {loadingHistory && !initialLoading && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0' }}>
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  border: '2px solid #e5e5ea',
                  borderTopColor: '#0071E3',
                  animation: 'spin 0.7s linear infinite',
                }}
              />
              <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
            </div>
          )}

          {messages.length === 0 && !initialLoading && !loadingHistory && (
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#aeaeb2',
                padding: '40px 0',
              }}
            >
              <div style={{ fontSize: 40, marginBottom: 12 }}>💬</div>
              <p style={{ fontSize: 14, margin: 0 }}>아직 메시지가 없습니다.</p>
              <p style={{ fontSize: 12, margin: '4px 0 0' }}>첫 번째 메시지를 보내보세요!</p>
            </div>
          )}

          {messages.map((msg, i) => {
            const isMine = msg.sender_id === user?.id;
            const prev = messages[i - 1];
            const showDate = !prev || !isSameDay(prev.created_at, msg.created_at);
            const showAvatar =
              !prev ||
              prev.sender_id !== msg.sender_id ||
              new Date(msg.created_at).getTime() - new Date(prev.created_at).getTime() > 60_000;
            const sysAfterPrev = systemMessages.filter((_, si) => si === i);
            const unreadCount = isMine && sessionMsgIds.has(msg.id) && memberCount > 1 ? memberCount - 1 : undefined;

            return (
              <div key={msg.id}>
                {showDate && <DateDivider dateStr={formatDate(msg.created_at)} />}
                {sysAfterPrev.map((s) => (
                  <SystemLine key={s.key} content={s.content} />
                ))}
                <MessageBubble
                  msg={msg}
                  isMine={isMine}
                  showAvatar={showAvatar}
                  isAnimating={animatingMsgIds.has(msg.id)}
                  animOriginY={animOriginYRef.current}
                  onAnimDone={animatingMsgIds.has(msg.id) ? () => clearAnimation(msg.id) : undefined}
                  onFullView={() => setFullViewMsg(msg)}
                  unreadCount={unreadCount}
                />
              </div>
            );
          })}

          {systemMessages.slice(messages.length).map((s) => (
            <SystemLine key={s.key} content={s.content} />
          ))}
          <div ref={bottomRef} style={{ height: 16 }} />
        </div>

        {/* ── 입력창 ── */}
        <div ref={inputBarRef} style={{ flexShrink: 0, padding: '10px 16px 14px' }}>
          <div
            className="liquid"
            style={{
              borderRadius: 28,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 6px 6px 18px',
            }}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={wsState === 'open' ? '메시지를 입력하세요...' : '연결 중...'}
              disabled={wsState !== 'open'}
              rows={1}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                fontSize: 14,
                color: '#1d1d1f',
                resize: 'none',
                lineHeight: 1.5,
                fontFamily: FONT,
                maxHeight: 120,
                overflowY: 'auto',
                caretColor: '#0071E3',
                padding: '4px 0',
              }}
              onInput={(e) => {
                const el = e.target as HTMLTextAreaElement;
                el.style.height = 'auto';
                el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
              }}
            />
            <motion.button
              onClick={sendMessage}
              disabled={!input.trim() || wsState !== 'open' || isBubbleAnimating}
              whileHover={input.trim() && wsState === 'open' && !isBubbleAnimating ? { scale: 1.08 } : {}}
              whileTap={input.trim() && wsState === 'open' && !isBubbleAnimating ? { scale: 0.92 } : {}}
              className={input.trim() && wsState === 'open' ? 'liquid liquid-action' : 'liquid'}
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                border: 'none',
                cursor: input.trim() && wsState === 'open' && !isBubbleAnimating ? 'pointer' : 'default',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                opacity: input.trim() && wsState === 'open' ? 1 : 0.4,
              }}
            >
              {isBubbleAnimating ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: '50%',
                    border: '2px solid rgba(255,255,255,0.35)',
                    borderTopColor: '#fff',
                    flexShrink: 0,
                  }}
                />
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M22 2L11 13"
                    stroke="white"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M22 2L15 22L11 13L2 9L22 2Z"
                    stroke="white"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </motion.button>
          </div>
        </div>
      </div>

      {/* ══ 우측: 멤버/공지 패널 ═════════════════════════════════════════════ */}
      <AnimatePresence initial={false}>
        {isRightPanelOpen && (
          <motion.div
            key="right-panel"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: rightW, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            style={{ flexShrink: 0, overflow: 'hidden', height: '100dvh' }}
          >
            <LiquidGlassBase
              borderRadius={0}
              blur={24}
              tint="rgba(10,10,20,0.04)"
              withDistortion={false}
              style={{
                width: rightW,
                height: '100%',
                borderLeft: '0.5px solid rgba(255,255,255,0.45)',
                overflow: 'hidden',
              }}
            >
              <RightPanel
                roomInfo={roomInfo}
                noticeText={noticeText}
                isLeader={isLeader}
                user={user}
                onEditNotice={(rect) => openNoticeEdit(rect)}
                onDeleteNotice={() => saveNotice('')}
                onFullViewNotice={(rect) => openNoticeFullView(rect)}
              />
            </LiquidGlassBase>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══ 모달들 ═══════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {fullViewMsg && (
          <MessageFullViewModal
            key="msg-full"
            msg={fullViewMsg}
            isMine={fullViewMsg.sender_id === user?.id}
            onClose={() => setFullViewMsg(null)}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {noticeFullViewItem && (
          <NoticeFullViewModal
            key="notice-full"
            item={noticeFullViewItem}
            expandedH={noticeExpandedH}
            bodyRef={noticeModalBodyRef}
            onClose={() => setNoticeFullViewItem(null)}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {noticeEditItem && (
          <NoticeEditModal
            key="notice-edit"
            item={noticeEditItem}

            initial={noticeText}
            onSave={saveNotice}
            onCancel={() => setNoticeEditItem(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
