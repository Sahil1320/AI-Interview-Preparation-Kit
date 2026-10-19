'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Sparkles, Brain, Calendar, Target, ArrowRight, Zap, Shield, BookOpen } from 'lucide-react';

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session) {
      router.push('/dashboard');
    }
  }, [session, router]);

  if (status === 'loading') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div className="skeleton" style={{ width: 200, height: 40 }} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', overflow: 'hidden' }}>
      {/* Animated background */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0,
        background: 'radial-gradient(ellipse at 20% 50%, rgba(99, 102, 241, 0.08) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(168, 85, 247, 0.06) 0%, transparent 50%), radial-gradient(ellipse at 50% 80%, rgba(6, 182, 212, 0.05) 0%, transparent 50%)',
      }} />

      {/* Nav */}
      <nav className="glass" style={{
        position: 'sticky', top: 0, zIndex: 50,
        padding: '16px 0',
        borderBottom: '1px solid var(--border)',
      }}>
        <div className="container-main" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'var(--gradient-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Brain size={20} color="white" />
            </div>
            <span style={{ fontSize: 20, fontWeight: 700 }} className="gradient-text">InterviewKit AI</span>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn-secondary" onClick={() => router.push('/login')}>Log In</button>
            <button className="btn-primary" onClick={() => router.push('/register')}>Get Started</button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="container-main fade-in" style={{
        textAlign: 'center', padding: '100px 0 60px',
        position: 'relative', zIndex: 1,
      }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 24, padding: '6px 16px', borderRadius: 24, background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
          <Sparkles size={14} color="var(--accent-blue-hover)" />
          <span style={{ fontSize: 13, color: 'var(--accent-blue-hover)', fontWeight: 500 }}>AI-Powered Interview Preparation</span>
        </div>

        <h1 style={{ fontSize: 'clamp(36px, 5vw, 64px)', fontWeight: 800, lineHeight: 1.1, marginBottom: 24, maxWidth: 800, margin: '0 auto 24px' }}>
          Turn Any Job Description Into Your{' '}
          <span className="gradient-text">Interview Playbook</span>
        </h1>

        <p style={{ fontSize: 18, color: 'var(--text-secondary)', maxWidth: 600, margin: '0 auto 40px', lineHeight: 1.7 }}>
          Paste a job description, add the company URL, and let AI research the company,
          generate tailored questions, flashcards, and a personalized study schedule.
        </p>

        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="btn-primary" style={{ padding: '14px 32px', fontSize: 16 }} onClick={() => router.push('/register')}>
            Start Preparing <ArrowRight size={18} />
          </button>
          <button className="btn-secondary" style={{ padding: '14px 32px', fontSize: 16 }} onClick={() => {
            document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
          }}>
            See How It Works
          </button>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="container-main" style={{ padding: '60px 0 100px', position: 'relative', zIndex: 1 }}>
        <h2 style={{ textAlign: 'center', fontSize: 32, fontWeight: 700, marginBottom: 48 }}>
          Everything You Need to <span className="gradient-text">Ace Your Interview</span>
        </h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 20,
        }}>
          {[
            { icon: <Target size={24} />, title: 'Smart Requirement Extraction', desc: 'AI analyzes the JD to identify must-have and nice-to-have requirements, categorized by type.', color: 'var(--accent-blue)' },
            { icon: <Brain size={24} />, title: 'Company Research', desc: 'Automatically crawls the company website to understand what they do and how they hire.', color: 'var(--accent-purple)' },
            { icon: <Zap size={24} />, title: 'Tailored Questions', desc: 'Generates interview questions by category — technical, behavioural, system design, and company fit.', color: 'var(--accent-amber)' },
            { icon: <BookOpen size={24} />, title: 'Flashcards & Practice', desc: 'Study with flashcards, track confidence, and focus on your weakest areas with spaced repetition.', color: 'var(--accent-green)' },
            { icon: <Calendar size={24} />, title: 'Study Schedule', desc: 'Get a day-by-day plan that distributes harder material early and covers every requirement.', color: 'var(--accent-cyan)' },
            { icon: <Shield size={24} />, title: 'AI Mock Interview', desc: 'Upload your resume for a personalized mock interview with timed questions and instant AI feedback.', color: 'var(--accent-red)' },
          ].map((feature, i) => (
            <div key={i} className="card-hover" style={{
              padding: 28,
              borderRadius: 'var(--radius-lg)',
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              animationDelay: `${i * 0.1}s`,
            }}>
              <div style={{
                width: 48, height: 48, borderRadius: 12,
                background: `${feature.color}15`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 16, color: feature.color,
              }}>
                {feature.icon}
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>{feature.title}</h3>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{
        padding: '80px 0',
        background: 'linear-gradient(180deg, transparent, rgba(99, 102, 241, 0.05))',
        position: 'relative', zIndex: 1,
      }}>
        <div className="container-main" style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: 32, fontWeight: 700, marginBottom: 16 }}>
            Ready to Prepare Smarter?
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 32, fontSize: 16 }}>
            Join thousands of candidates who use AI to prepare for their dream job interviews.
          </p>
          <button className="btn-primary" style={{ padding: '14px 40px', fontSize: 16 }} onClick={() => router.push('/register')}>
            Create Free Account <ArrowRight size={18} />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid var(--border)',
        padding: '24px 0',
        position: 'relative', zIndex: 1,
      }}>
        <div className="container-main" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>© 2026 InterviewKit AI. Built for Trao Assessment.</span>
          <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>Powered by Google Gemini</span>
        </div>
      </footer>
    </div>
  );
}
