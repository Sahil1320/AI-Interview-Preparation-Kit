'use client';

import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { Brain, LogOut, User, PlusCircle, LayoutDashboard } from 'lucide-react';

export default function Navbar() {
  const { data: session } = useSession();

  return (
    <nav style={{
      borderBottom: '1px solid var(--border)',
      background: 'rgba(17, 17, 24, 0.85)',
      backdropFilter: 'blur(16px)',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      padding: '0 24px',
    }}>
      <div style={{
        maxWidth: 1280,
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 64,
      }}>
        {/* Brand */}
        <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'var(--gradient-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Brain size={20} color="white" />
          </div>
          <span style={{ fontSize: 18, fontWeight: 700 }} className="gradient-text">InterviewKit AI</span>
        </Link>

        {/* Navigation links & User actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link
            href="/dashboard"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              color: 'var(--text-secondary)',
              textDecoration: 'none',
              fontSize: 14,
              fontWeight: 500,
              padding: '8px 12px',
              borderRadius: 'var(--radius)',
              transition: 'all 0.2s',
            }}
            onMouseOver={(e) => {
              (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)';
              (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)';
            }}
            onMouseOut={(e) => {
              (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)';
              (e.currentTarget as HTMLElement).style.background = 'transparent';
            }}
          >
            <LayoutDashboard size={16} />
            Dashboard
          </Link>

          {session?.user && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, borderLeft: '1px solid var(--border)', paddingLeft: 16 }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: 'var(--bg-card)',
                padding: '6px 12px',
                borderRadius: 20,
                border: '1px solid var(--border)',
                fontSize: 13,
                color: 'var(--text-secondary)',
              }}>
                <User size={14} color="var(--accent-blue-hover)" />
                <span style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {session.user.name || session.user.email}
                </span>
              </div>

              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: 8,
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  transition: 'color 0.2s',
                }}
                title="Sign Out"
                onMouseOver={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--accent-red)')}
                onMouseOut={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--text-muted)')}
              >
                <LogOut size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
