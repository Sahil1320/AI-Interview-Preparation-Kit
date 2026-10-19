'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import {
  Building, BookOpen, Layers, Calendar, Sparkles, RefreshCw,
  Plus, Trash2, Edit3, Check, X, ArrowUp, ArrowDown, ChevronRight,
  ShieldCheck, AlertCircle, Save, Mic, ExternalLink, Move
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Requirement {
  id: string;
  category: string;
  description: string;
  isMustHave: boolean;
}

interface Question {
  id: string;
  category: 'technical' | 'behavioral' | 'domain';
  question: string;
  answerOutline: string;
  requirementId: string;
  isCustom?: boolean;
  isEdited?: boolean;
}

interface Flashcard {
  id: string;
  front: string;
  back: string;
  category: string;
  confidence?: number;
  isCustom?: boolean;
}

interface ScheduleDay {
  day: number;
  minutes: number;
  topics: string[];
  questionIds: string[];
}

interface KitData {
  _id: string;
  status?: string;
  progress?: { step?: string; percentage?: number; message?: string };
  companyName: string;
  companyUrl: string;
  role: string;
  daysUntilInterview: number;
  dailyStudyMinutes: number;
  companyBrief: {
    overview: string;
    cultureAndValues: string[];
    recentNewsOrInitiatives: string[];
    interviewStyleInsights: string;
  };
  requirements: Requirement[];
  questions: Question[];
  flashcards: Flashcard[];
  schedule: ScheduleDay[];
  coverageStats: {
    mustHaveRequirementsTotal: number;
    mustHaveRequirementsCovered: number;
    coveragePercentage: number;
  };
}

// Sortable Question Item Component
function SortableQuestionItem({
  q,
  onEdit,
  onDelete,
  onMoveCategory,
}: {
  q: Question;
  onEdit: (q: Question) => void;
  onDelete: (id: string) => void;
  onMoveCategory: (id: string, newCat: 'technical' | 'behavioral' | 'domain') => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: q.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const [isEditing, setIsEditing] = useState(false);
  const [questionText, setQuestionText] = useState(q.question);
  const [answerOutline, setAnswerOutline] = useState(q.answerOutline);

  const handleSave = () => {
    onEdit({
      ...q,
      question: questionText,
      answerOutline,
      isEdited: true,
    });
    setIsEditing(false);
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: 16,
        marginBottom: 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        {/* Drag handle */}
        <div
          {...attributes}
          {...listeners}
          style={{ cursor: 'grab', color: 'var(--text-muted)', paddingTop: 4 }}
          title="Drag to reorder"
        >
          <Move size={16} />
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span className={`badge ${
              q.category === 'technical' ? 'badge-blue' : q.category === 'behavioral' ? 'badge-purple' : 'badge-amber'
            }`}>
              {q.category}
            </span>
            {q.isEdited && (
              <span className="badge badge-cyan" style={{ fontSize: 10 }}>
                Edited
              </span>
            )}
            {q.isCustom && (
              <span className="badge badge-green" style={{ fontSize: 10 }}>
                Custom Added
              </span>
            )}
          </div>

          {isEditing ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input
                className="input-field"
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                placeholder="Question"
              />
              <textarea
                className="textarea-field"
                rows={3}
                value={answerOutline}
                onChange={(e) => setAnswerOutline(e.target.value)}
                placeholder="Target answer outline / key points"
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={handleSave} className="btn-primary" style={{ padding: '6px 14px', fontSize: 12 }}>
                  <Check size={14} /> Save Edit
                </button>
                <button onClick={() => setIsEditing(false)} className="btn-secondary" style={{ padding: '6px 14px', fontSize: 12 }}>
                  <X size={14} /> Cancel
                </button>
              </div>
            </div>
          ) : (
            <div>
              <h4 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
                {q.question}
              </h4>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', background: 'var(--bg-secondary)', padding: '8px 12px', borderRadius: 8 }}>
                <strong style={{ color: 'var(--accent-blue-hover)' }}>Target Answer:</strong> {q.answerOutline}
              </p>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <select
            value={q.category}
            onChange={(e) => onMoveCategory(q.id, e.target.value as any)}
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              color: 'var(--text-secondary)',
              fontSize: 12,
              borderRadius: 6,
              padding: '4px 6px',
            }}
            title="Move category"
          >
            <option value="technical">Technical</option>
            <option value="behavioral">Behavioral</option>
            <option value="domain">Domain</option>
          </select>

          <button
            onClick={() => setIsEditing(!isEditing)}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}
            title="Edit question inline"
          >
            <Edit3 size={15} />
          </button>

          <button
            onClick={() => onDelete(q.id)}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}
            title="Delete question"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function KitBuilderPage() {
  const routeParams = useParams();
  const kitId = (routeParams?.id as string) || '';

  const [kit, setKit] = useState<KitData | null>(null);
  const [activeTab, setActiveTab] = useState<'brief' | 'questions' | 'flashcards' | 'schedule'>('questions');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [regeneratingSection, setRegeneratingSection] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState('');

  // Add Question Modal state
  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [newQuestionText, setNewQuestionText] = useState('');
  const [newQuestionOutline, setNewQuestionOutline] = useState('');
  const [newQuestionCategory, setNewQuestionCategory] = useState<'technical' | 'behavioral' | 'domain'>('technical');

  // Add Flashcard Modal state
  const [showAddFlashcard, setShowAddFlashcard] = useState(false);
  const [newCardFront, setNewCardFront] = useState('');
  const [newCardBack, setNewCardBack] = useState('');
  const [newCardCat, setNewCardCat] = useState('technical');

  // Brief inline edit state
  const [isEditingBrief, setIsEditingBrief] = useState(false);
  const [briefOverview, setBriefOverview] = useState('');
  const [briefStyle, setBriefStyle] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchKit(true);
  }, [kitId]);

  const fetchKit = async (initial = false) => {
    try {
      if (initial) setLoading(true);
      const res = await fetch(`/api/kits/${kitId}`);
      if (res.ok) {
        const data = await res.json();
        setKit(data.kit);
        if (data.kit?.companyBrief) {
          setBriefOverview(data.kit.companyBrief.overview || '');
          setBriefStyle(data.kit.companyBrief.interviewStyleInsights || '');
        }

        // Poll until ready or failed
        if (data.kit?.status === 'generating') {
          setTimeout(() => fetchKit(false), 2500);
        }
      }
    } catch (err) {
      console.error('Error fetching kit:', err);
    } finally {
      if (initial) setLoading(false);
    }
  };

  const saveKitChanges = async (updatedKit: KitData) => {
    setKit(updatedKit);
    try {
      setSaving(true);
      const res = await fetch(`/api/kits/${kitId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedKit),
      });
      if (res.ok) {
        setSaveMessage('Saved');
        setTimeout(() => setSaveMessage(''), 2500);
      }
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setSaving(false);
    }
  };

  // Drag and drop reordering
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!kit || !over || active.id === over.id) return;

    const oldIndex = kit.questions.findIndex((q) => q.id === active.id);
    const newIndex = kit.questions.findIndex((q) => q.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const reordered = arrayMove(kit.questions, oldIndex, newIndex);
      saveKitChanges({ ...kit, questions: reordered });
    }
  };

  const handleEditQuestion = (updatedQ: Question) => {
    if (!kit) return;
    const updated = kit.questions.map((q) => (q.id === updatedQ.id ? updatedQ : q));
    saveKitChanges({ ...kit, questions: updated });
  };

  const handleDeleteQuestion = (id: string) => {
    if (!kit) return;
    const updated = kit.questions.filter((q) => q.id !== id);
    saveKitChanges({ ...kit, questions: updated });
  };

  const handleMoveCategory = (id: string, newCat: 'technical' | 'behavioral' | 'domain') => {
    if (!kit) return;
    const updated = kit.questions.map((q) => (q.id === id ? { ...q, category: newCat, isEdited: true } : q));
    saveKitChanges({ ...kit, questions: updated });
  };

  const handleAddQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!kit || !newQuestionText) return;

    const newQ: Question = {
      id: `q-custom-${Date.now()}`,
      category: newQuestionCategory,
      question: newQuestionText,
      answerOutline: newQuestionOutline,
      requirementId: kit.requirements[0]?.id || 'custom-req',
      isCustom: true,
      isEdited: true,
    };

    saveKitChanges({ ...kit, questions: [...kit.questions, newQ] });
    setNewQuestionText('');
    setNewQuestionOutline('');
    setShowAddQuestion(false);
  };

  const handleDeleteFlashcard = (id: string) => {
    if (!kit) return;
    const updated = kit.flashcards.filter((f) => f.id !== id);
    saveKitChanges({ ...kit, flashcards: updated });
  };

  const handleAddFlashcard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!kit || !newCardFront || !newCardBack) return;

    const newF: Flashcard = {
      id: `fc-custom-${Date.now()}`,
      front: newCardFront,
      back: newCardBack,
      category: newCardCat,
      isCustom: true,
    };

    saveKitChanges({ ...kit, flashcards: [...kit.flashcards, newF] });
    setNewCardFront('');
    setNewCardBack('');
    setShowAddFlashcard(false);
  };

  const handleRegenerateSection = async (section: 'brief' | 'schedule' | 'technical' | 'behavioral' | 'domain') => {
    if (!kit) return;
    try {
      setRegeneratingSection(section);
      const res = await fetch(`/api/kits/${kitId}/regenerate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section }),
      });
      if (res.ok) {
        const data = await res.json();
        setKit(data.kit);
        if (data.kit?.companyBrief) {
          setBriefOverview(data.kit.companyBrief.overview || '');
          setBriefStyle(data.kit.companyBrief.interviewStyleInsights || '');
        }
      }
    } catch (err) {
      console.error('Failed to regenerate section:', err);
    } finally {
      setRegeneratingSection(null);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
        <Navbar />
        <div className="container-main" style={{ padding: '60px 24px' }}>
          <div className="skeleton" style={{ height: 60, marginBottom: 20 }} />
          <div className="skeleton" style={{ height: 300 }} />
        </div>
      </div>
    );
  }

  if (kit?.status === 'generating') {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
        <Navbar />
        <div className="container-main" style={{ padding: '80px 24px', textAlign: 'center', maxWidth: 640, margin: '0 auto' }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            border: '4px solid var(--border)',
            borderTopColor: 'var(--accent-blue)',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 24px',
          }} />
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
          <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>
            Generating Preparation Kit
          </h2>
          <p style={{ color: 'var(--accent-blue-hover)', fontSize: 16, fontWeight: 500, marginBottom: 24 }}>
            {kit.progress?.message || 'Analyzing requirements and generating question bank...'}
          </p>
          <div style={{ width: '100%', height: 8, background: 'var(--bg-card)', borderRadius: 4, overflow: 'hidden', border: '1px solid var(--border)', marginBottom: 16 }}>
            <div style={{
              width: `${Math.max(10, kit.progress?.percentage || 15)}%`,
              height: '100%',
              background: 'var(--gradient-primary)',
              transition: 'width 0.4s ease',
            }} />
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
            Our autonomous pipeline is crawling the company site, enforcing 100% must-have coverage, and building your personalized schedule. This page will update automatically.
          </p>
        </div>
      </div>
    );
  }

  if (!kit) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
        <Navbar />
        <div className="container-main" style={{ padding: '80px 24px', textAlign: 'center' }}>
          <h2>Kit not found</h2>
          <Link href="/dashboard" className="btn-primary" style={{ marginTop: 20 }}>
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', paddingBottom: 80 }}>
      <Navbar />

      <main className="container-main" style={{ padding: '32px 24px' }}>
        {/* Top Header Bar */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 24,
          flexWrap: 'wrap',
          gap: 16,
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="badge badge-blue">{kit.role}</span>
              <span className="badge badge-green">
                <ShieldCheck size={12} style={{ marginRight: 4 }} />
                100% Must-Have Coverage
              </span>
              {saveMessage && (
                <span className="badge badge-purple" style={{ animation: 'fadeIn 0.3s' }}>
                  ✓ {saveMessage}
                </span>
              )}
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 800, marginTop: 8 }}>
              {kit.companyName} Interview Preparation Kit
            </h1>
          </div>

          {/* Quick Action Navigation */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Link
              href={`/kits/${kitId}/practice`}
              className="btn-secondary"
              style={{ textDecoration: 'none' }}
            >
              <Layers size={16} />
              Flashcard Practice
            </Link>

            <Link
              href={`/kits/${kitId}/mock-interview`}
              className="btn-primary"
              style={{ textDecoration: 'none', background: 'linear-gradient(135deg, #10b981, #059669)' }}
            >
              <Mic size={16} />
              AI Mock Interview
            </Link>
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid var(--border)',
          marginBottom: 28,
          gap: 8,
          overflowX: 'auto',
        }}>
          <button
            onClick={() => setActiveTab('questions')}
            style={{
              padding: '12px 20px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'questions' ? '2px solid var(--accent-blue)' : '2px solid transparent',
              color: activeTab === 'questions' ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: 14,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <BookOpen size={16} />
            Question Bank ({kit.questions.length})
          </button>

          <button
            onClick={() => setActiveTab('brief')}
            style={{
              padding: '12px 20px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'brief' ? '2px solid var(--accent-blue)' : '2px solid transparent',
              color: activeTab === 'brief' ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: 14,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Building size={16} />
            Company Brief
          </button>

          <button
            onClick={() => setActiveTab('flashcards')}
            style={{
              padding: '12px 20px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'flashcards' ? '2px solid var(--accent-blue)' : '2px solid transparent',
              color: activeTab === 'flashcards' ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: 14,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Layers size={16} />
            Flashcards ({kit.flashcards.length})
          </button>

          <button
            onClick={() => setActiveTab('schedule')}
            style={{
              padding: '12px 20px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'schedule' ? '2px solid var(--accent-blue)' : '2px solid transparent',
              color: activeTab === 'schedule' ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: 14,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Calendar size={16} />
            Study Schedule ({kit.daysUntilInterview} Days)
          </button>
        </div>

        {/* TAB 1: QUESTIONS */}
        {activeTab === 'questions' && (
          <div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 20,
              flexWrap: 'wrap',
              gap: 12,
            }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
                Drag questions to reorder priority. Use dropdown to reclassify categories. Click edit icon to change text inline.
              </p>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => setShowAddQuestion(true)}
                  className="btn-secondary"
                  style={{ fontSize: 13, padding: '8px 14px' }}
                >
                  <Plus size={15} /> Add Custom Question
                </button>

                <button
                  onClick={() => handleRegenerateSection('technical')}
                  disabled={!!regeneratingSection}
                  className="btn-secondary"
                  style={{ fontSize: 13, padding: '8px 14px' }}
                >
                  <RefreshCw size={14} className={regeneratingSection === 'technical' ? 'pulse-glow' : ''} />
                  {regeneratingSection === 'technical' ? 'Regenerating...' : 'Regen Technical'}
                </button>
              </div>
            </div>

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={kit.questions.map((q) => q.id)} strategy={verticalListSortingStrategy}>
                {kit.questions.map((q) => (
                  <SortableQuestionItem
                    key={q.id}
                    q={q}
                    onEdit={handleEditQuestion}
                    onDelete={handleDeleteQuestion}
                    onMoveCategory={handleMoveCategory}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </div>
        )}

        {/* TAB 2: COMPANY BRIEF */}
        {activeTab === 'brief' && (
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: 32,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div>
                <h3 style={{ fontSize: 20, fontWeight: 700 }}>Autonomous Company Intelligence</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>
                  Scraped and synthesized directly from {kit.companyUrl}
                </p>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => handleRegenerateSection('brief')}
                  disabled={!!regeneratingSection}
                  className="btn-secondary"
                  style={{ fontSize: 13, padding: '8px 14px' }}
                >
                  <RefreshCw size={14} className={regeneratingSection === 'brief' ? 'pulse-glow' : ''} />
                  {regeneratingSection === 'brief' ? 'Regenerating...' : 'Regenerate Brief'}
                </button>

                {!isEditingBrief ? (
                  <button
                    onClick={() => setIsEditingBrief(true)}
                    className="btn-secondary"
                    style={{ fontSize: 13, padding: '8px 14px' }}
                  >
                    <Edit3 size={14} /> Edit Brief
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      if (!kit) return;
                      saveKitChanges({
                        ...kit,
                        companyBrief: {
                          ...kit.companyBrief,
                          overview: briefOverview,
                          interviewStyleInsights: briefStyle,
                        },
                      });
                      setIsEditingBrief(false);
                    }}
                    className="btn-primary"
                    style={{ fontSize: 13, padding: '8px 14px' }}
                  >
                    <Save size={14} /> Save Brief
                  </button>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div>
                <h4 style={{ fontSize: 15, fontWeight: 600, color: 'var(--accent-blue-hover)', marginBottom: 8 }}>
                  Company Overview & Business Model
                </h4>
                {isEditingBrief ? (
                  <textarea
                    className="textarea-field"
                    value={briefOverview}
                    onChange={(e) => setBriefOverview(e.target.value)}
                  />
                ) : (
                  <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, fontSize: 14 }}>
                    {kit.companyBrief?.overview || 'No company overview available.'}
                  </p>
                )}
              </div>

              <div>
                <h4 style={{ fontSize: 15, fontWeight: 600, color: 'var(--accent-purple)', marginBottom: 8 }}>
                  Core Culture & Values
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {kit.companyBrief?.cultureAndValues?.map((val, idx) => (
                    <span key={idx} className="badge badge-purple" style={{ padding: '6px 14px', fontSize: 13 }}>
                      {val}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h4 style={{ fontSize: 15, fontWeight: 600, color: 'var(--accent-amber)', marginBottom: 8 }}>
                  Interview Style & What They Look For
                </h4>
                {isEditingBrief ? (
                  <textarea
                    className="textarea-field"
                    value={briefStyle}
                    onChange={(e) => setBriefStyle(e.target.value)}
                  />
                ) : (
                  <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, fontSize: 14 }}>
                    {kit.companyBrief?.interviewStyleInsights || 'Standard behavioral and technical evaluations.'}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: FLASHCARDS */}
        {activeTab === 'flashcards' && (
          <div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 20,
              flexWrap: 'wrap',
              gap: 12,
            }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700 }}>Flashcard Deck</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                  Quick concept retention cards for rapid recall before interview day.
                </p>
              </div>

              <button
                onClick={() => setShowAddFlashcard(true)}
                className="btn-secondary"
                style={{ fontSize: 13, padding: '8px 14px' }}
              >
                <Plus size={15} /> Add Custom Flashcard
              </button>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: 20,
            }}>
              {kit.flashcards.map((fc) => (
                <div
                  key={fc.id}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)',
                    padding: 20,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <span className="badge badge-cyan" style={{ fontSize: 11 }}>
                        {fc.category}
                      </span>
                      <button
                        onClick={() => handleDeleteFlashcard(fc.id)}
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                        title="Delete Card"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <h4 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
                      {fc.front}
                    </h4>

                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', background: 'var(--bg-secondary)', padding: '10px 12px', borderRadius: 8 }}>
                      {fc.back}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: STUDY SCHEDULE */}
        {activeTab === 'schedule' && (
          <div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 20,
              flexWrap: 'wrap',
              gap: 12,
            }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700 }}>
                  Personalized {kit.daysUntilInterview}-Day Study Roadmap
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                  Optimized timeline distributing must-have competencies first, committing {kit.dailyStudyMinutes} mins/day.
                </p>
              </div>

              <button
                onClick={() => handleRegenerateSection('schedule')}
                disabled={!!regeneratingSection}
                className="btn-secondary"
                style={{ fontSize: 13, padding: '8px 14px' }}
              >
                <RefreshCw size={14} className={regeneratingSection === 'schedule' ? 'pulse-glow' : ''} />
                {regeneratingSection === 'schedule' ? 'Rebalancing...' : 'Rebalance Schedule'}
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {kit.schedule?.map((day) => (
                <div
                  key={day.day}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)',
                    padding: 20,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent-blue-hover)' }}>
                      Day {day.day}
                    </span>
                    <span className="badge badge-blue">
                      {day.minutes} mins
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Focus Topics:</span>
                    {day.topics?.map((topic, i) => (
                      <div key={i} style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-cyan)' }} />
                        {topic}
                      </div>
                    ))}
                  </div>

                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {day.questionIds?.length || 0} questions assigned
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Add Custom Question Modal */}
      {showAddQuestion && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20,
        }}>
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 500, padding: 28,
          }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Add Custom Question</h3>
            <form onSubmit={handleAddQuestion} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, marginBottom: 4, color: 'var(--text-secondary)' }}>Category</label>
                <select
                  value={newQuestionCategory}
                  onChange={(e) => setNewQuestionCategory(e.target.value as any)}
                  className="input-field"
                >
                  <option value="technical">Technical</option>
                  <option value="behavioral">Behavioral</option>
                  <option value="domain">Domain Specific</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, marginBottom: 4, color: 'var(--text-secondary)' }}>Question *</label>
                <input
                  required
                  className="input-field"
                  placeholder="e.g. How do you design idempotent RESTful APIs?"
                  value={newQuestionText}
                  onChange={(e) => setNewQuestionText(e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, marginBottom: 4, color: 'var(--text-secondary)' }}>Target Answer Outline *</label>
                <textarea
                  required
                  className="textarea-field"
                  rows={4}
                  placeholder="Mention unique idempotency keys, DB transactions, 409 status..."
                  value={newQuestionOutline}
                  onChange={(e) => setNewQuestionOutline(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                <button type="button" onClick={() => setShowAddQuestion(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Add Question</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Custom Flashcard Modal */}
      {showAddFlashcard && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20,
        }}>
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 500, padding: 28,
          }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Add Custom Flashcard</h3>
            <form onSubmit={handleAddFlashcard} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, marginBottom: 4, color: 'var(--text-secondary)' }}>Category</label>
                <input
                  required
                  className="input-field"
                  placeholder="e.g. System Design, React, SQL"
                  value={newCardCat}
                  onChange={(e) => setNewCardCat(e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, marginBottom: 4, color: 'var(--text-secondary)' }}>Front (Prompt / Term) *</label>
                <input
                  required
                  className="input-field"
                  placeholder="e.g. CAP Theorem"
                  value={newCardFront}
                  onChange={(e) => setNewCardFront(e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, marginBottom: 4, color: 'var(--text-secondary)' }}>Back (Explanation) *</label>
                <textarea
                  required
                  className="textarea-field"
                  rows={4}
                  placeholder="Consistency, Availability, Partition tolerance..."
                  value={newCardBack}
                  onChange={(e) => setNewCardBack(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                <button type="button" onClick={() => setShowAddFlashcard(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Add Card</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
