'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import {
  PlusCircle, BookOpen, Calendar, HelpCircle, Layers,
  Trash2, ArrowRight, ExternalLink, Sparkles, Building,
  Clock, AlertCircle, CheckCircle2, ChevronRight, Mic
} from 'lucide-react';
import Link from 'next/link';

interface KitSummary {
  _id: string;
  companyName: string;
  role: string;
  daysUntilInterview: number;
  dailyStudyMinutes: number;
  requirementsCount: number;
  questionsCount: number;
  flashcardsCount: number;
  createdAt: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [kits, setKits] = useState<KitSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New kit form state
  const [companyName, setCompanyName] = useState('');
  const [companyUrl, setCompanyUrl] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [daysUntilInterview, setDaysUntilInterview] = useState(7);
  const [dailyStudyMinutes, setDailyStudyMinutes] = useState(60);
  const [generating, setGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchKits();
  }, []);

  const fetchKits = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/kits');
      if (res.ok) {
        const data = await res.json();
        setKits(data.kits || []);
      }
    } catch (err) {
      console.error('Failed to load kits:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateKit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setGenerating(true);
    setGenerationStep('Analyzing Job Description & Crawling Company...');

    const stepTimer = setTimeout(() => {
      setGenerationStep('Extracting Core Requirements & Matching Questions...');
    }, 4000);

    const stepTimer2 = setTimeout(() => {
      setGenerationStep('Verifying Must-Have Requirement Coverage & Schedule...');
    }, 10000);

    try {
      const res = await fetch('/api/kits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName,
          companyUrl,
          jobDescription,
          daysAvailable: daysUntilInterview,
          daysUntilInterview,
          dailyStudyMinutes,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to generate prep kit');
      } else {
        setShowCreateModal(false);
        const targetId = data.kitId || data.kit?._id;
        if (targetId) {
          router.push(`/kits/${targetId}`);
        } else {
          fetchKits();
        }
      }
    } catch {
      setError('An unexpected error occurred during kit generation.');
    } finally {
      clearTimeout(stepTimer);
      clearTimeout(stepTimer2);
      setGenerating(false);
      setGenerationStep('');
    }
  };

  const handleDeleteKit = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete the kit for ${name}?`)) return;

    try {
      const res = await fetch(`/api/kits/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setKits((prev) => prev.filter((k) => k._id !== id));
      } else {
        alert('Failed to delete kit');
      }
    } catch {
      alert('Error deleting kit');
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <Navbar />

      <main className="container-main" style={{ padding: '40px 24px' }}>
        {/* Top Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 36,
          flexWrap: 'wrap',
          gap: 16,
        }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px' }}>
              Interview Preparation Kits
            </h1>
            <p style={{ color: 'var(--text-secondary)', marginTop: 6, fontSize: 15 }}>
              Generate, customize, and practice targeted kits powered by autonomous AI agents.
            </p>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary"
            style={{ padding: '12px 20px', fontSize: 14 }}
          >
            <PlusCircle size={18} />
            Create New Kit
          </button>
        </div>

        {/* Quick Stats Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
          marginBottom: 40,
        }}>
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            padding: 20,
            borderRadius: 'var(--radius)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: 13, fontWeight: 500 }}>Active Kits</span>
              <BookOpen size={18} color="var(--accent-blue)" />
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, marginTop: 10 }}>{kits.length}</div>
          </div>

          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            padding: 20,
            borderRadius: 'var(--radius)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: 13, fontWeight: 500 }}>Total Questions</span>
              <HelpCircle size={18} color="var(--accent-purple)" />
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, marginTop: 10 }}>
              {kits.reduce((acc, k) => acc + (k.questionsCount || 0), 0)}
            </div>
          </div>

          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            padding: 20,
            borderRadius: 'var(--radius)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: 13, fontWeight: 500 }}>Flashcards</span>
              <Layers size={18} color="var(--accent-cyan)" />
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, marginTop: 10 }}>
              {kits.reduce((acc, k) => acc + (k.flashcardsCount || 0), 0)}
            </div>
          </div>

          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            padding: 20,
            borderRadius: 'var(--radius)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: 13, fontWeight: 500 }}>Mock Practice</span>
              <Mic size={18} color="var(--accent-green)" />
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, marginTop: 10 }}>Ready</div>
          </div>
        </div>

        {/* Kits List */}
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 }}>
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton" style={{ height: 220 }} />
            ))}
          </div>
        ) : kits.length === 0 ? (
          <div style={{
            background: 'var(--bg-card)',
            border: '1px dashed var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: '60px 24px',
            textAlign: 'center',
            maxWidth: 600,
            margin: '0 auto',
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: 'rgba(99, 102, 241, 0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px',
            }}>
              <Sparkles size={28} color="var(--accent-blue-hover)" />
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>No preparation kits yet</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
              Paste any job description and company URL to generate an end-to-end interview kit complete with company brief, tailored questions, flashcards, and a daily timeline.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary"
            >
              <PlusCircle size={16} />
              Create First Kit
            </button>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
            gap: 24,
          }}>
            {kits.map((kit) => (
              <div
                key={kit._id}
                className="card-hover"
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: 24,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div>
                      <span className="badge badge-blue" style={{ marginBottom: 8 }}>
                        {kit.daysUntilInterview} Days Left
                      </span>
                      <h3 style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>
                        {kit.role || 'Software Engineer'}
                      </h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>
                        <Building size={14} />
                        {kit.companyName}
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteKit(kit._id, kit.companyName)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        padding: 6,
                        borderRadius: 6,
                      }}
                      title="Delete Kit"
                      onMouseOver={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--accent-red)')}
                      onMouseOut={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--text-muted)')}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 8,
                    background: 'var(--bg-secondary)',
                    padding: '12px 14px',
                    borderRadius: 'var(--radius)',
                    margin: '16px 0',
                    textAlign: 'center',
                  }}>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Reqs</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent-cyan)' }}>{kit.requirementsCount}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Questions</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent-blue-hover)' }}>{kit.questionsCount}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Flashcards</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent-purple)' }}>{kit.flashcardsCount}</div>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
                  <Link
                    href={`/kits/${kit._id}`}
                    className="btn-primary"
                    style={{ width: '100%', justifyContent: 'center', textDecoration: 'none' }}
                  >
                    Open Builder
                    <ChevronRight size={16} />
                  </Link>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <Link
                      href={`/kits/${kit._id}/practice`}
                      className="btn-secondary"
                      style={{ justifyContent: 'center', textDecoration: 'none', fontSize: 13, padding: '8px 12px' }}
                    >
                      <Layers size={14} />
                      Practice
                    </Link>

                    <Link
                      href={`/kits/${kit._id}/mock-interview`}
                      className="btn-secondary"
                      style={{ justifyContent: 'center', textDecoration: 'none', fontSize: 13, padding: '8px 12px', borderColor: 'rgba(34, 197, 94, 0.4)' }}
                    >
                      <Mic size={14} color="var(--accent-green)" />
                      AI Mock
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create Kit Modal */}
      {showCreateModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: 20,
        }}>
          <div className="fade-in" style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            width: '100%',
            maxWidth: 620,
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: 32,
            boxShadow: 'var(--shadow-card)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 700 }}>Generate Interview Prep Kit</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>
                  Our autonomous pipeline will scrape the company and build a complete question bank.
                </p>
              </div>
              <button
                disabled={generating}
                onClick={() => setShowCreateModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: 22,
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>

            {error && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '12px 16px', borderRadius: 'var(--radius)',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                color: 'var(--accent-red)',
                fontSize: 14, marginBottom: 16,
              }}>
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            {generating ? (
              <div style={{ textAlign: 'center', padding: '40px 16px' }}>
                <div style={{
                  width: 60, height: 60, borderRadius: '50%',
                  border: '3px solid var(--border)',
                  borderTopColor: 'var(--accent-blue)',
                  animation: 'spin 1s linear infinite',
                  margin: '0 auto 24px',
                }} />
                <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                <h4 style={{ fontSize: 17, fontWeight: 600, marginBottom: 8 }}>Generating Custom Prep Kit</h4>
                <p style={{ color: 'var(--accent-blue-hover)', fontSize: 14, fontWeight: 500 }}>
                  {generationStep}
                </p>
                <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 12 }}>
                  Scraping site, extracting requirements, generating categorized questions, and calculating 100% must-have coverage...
                </p>
              </div>
            ) : (
              <form onSubmit={handleCreateKit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--text-secondary)' }}>
                    Company Name *
                  </label>
                  <input
                    type="text"
                    required
                    className="input-field"
                    placeholder="e.g. Stripe, Airbnb, Google, or Startup"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--text-secondary)' }}>
                    Company Website / Careers URL *
                  </label>
                  <input
                    type="url"
                    required
                    className="input-field"
                    placeholder="https://stripe.com or https://stripe.com/jobs"
                    value={companyUrl}
                    onChange={(e) => setCompanyUrl(e.target.value)}
                  />
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                    Used by the web crawler to fetch company mission, values, and interview insights.
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--text-secondary)' }}>
                      Days Until Interview
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={60}
                      required
                      className="input-field"
                      value={daysUntilInterview}
                      onChange={(e) => setDaysUntilInterview(parseInt(e.target.value) || 1)}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--text-secondary)' }}>
                      Daily Study Commitment (Minutes)
                    </label>
                    <input
                      type="number"
                      min={15}
                      max={480}
                      required
                      className="input-field"
                      value={dailyStudyMinutes}
                      onChange={(e) => setDailyStudyMinutes(parseInt(e.target.value) || 60)}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--text-secondary)' }}>
                    Job Description (Paste complete text) *
                  </label>
                  <textarea
                    required
                    className="textarea-field"
                    rows={8}
                    placeholder="Paste the full job description here, including responsibilities, requirements, qualifications, and role overview..."
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                    <span>Must include responsibilities or requirements</span>
                    <span>{jobDescription.length} characters</span>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 12 }}>
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={!companyName || !companyUrl || !jobDescription}
                  >
                    <Sparkles size={16} />
                    Run Pipeline & Generate
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
