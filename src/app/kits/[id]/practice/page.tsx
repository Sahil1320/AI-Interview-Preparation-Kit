'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import {
  ChevronLeft, ChevronRight, Eye, RefreshCw, CheckCircle2,
  Award, ArrowRight, RotateCcw, Sparkles, Star, Layers
} from 'lucide-react';

interface Flashcard {
  id: string;
  front: string;
  back: string;
  category: string;
}

interface KitData {
  _id: string;
  companyName: string;
  role: string;
  flashcards: Flashcard[];
}

interface CardProgress {
  flashcardId: string;
  confidence: number;
  timesReviewed: number;
}

export default function PracticeModePage() {
  const routeParams = useParams();
  const kitId = (routeParams?.id as string) || '';

  const [kit, setKit] = useState<KitData | null>(null);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [sessionCompleted, setSessionCompleted] = useState(false);

  useEffect(() => {
    loadData();
  }, [kitId]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (sessionCompleted || loading || cards.length === 0) return;

      if (e.code === 'Space') {
        e.preventDefault();
        setIsFlipped((prev) => !prev);
      } else if (isFlipped && ['1', '2', '3', '4', '5'].includes(e.key)) {
        handleRate(parseInt(e.key));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFlipped, sessionCompleted, loading, cards, currentIndex]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [kitRes, sessionRes] = await Promise.all([
        fetch(`/api/kits/${kitId}`),
        fetch(`/api/practice/${kitId}`),
      ]);

      if (kitRes.ok) {
        const kitData = await kitRes.json();
        setKit(kitData.kit);

        let cardList: Flashcard[] = [...(kitData.kit.flashcards || [])];

        // Fetch prior progress and sort confidence-weighted (lowest confidence first)
        if (sessionRes.ok) {
          const sessionData = await sessionRes.json();
          const progressMap: Record<string, number> = {};
          sessionData.session?.progress?.forEach((p: CardProgress) => {
            progressMap[p.flashcardId] = p.confidence;
          });

          // Sort: unpracticed (0) or lowest confidence cards come first
          cardList.sort((a, b) => {
            const confA = progressMap[a.id] ?? 0;
            const confB = progressMap[b.id] ?? 0;
            return confA - confB;
          });
        }

        setCards(cardList);
      }
    } catch (err) {
      console.error('Failed to load practice mode data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRate = async (confidence: number) => {
    const currentCard = cards[currentIndex];
    if (!currentCard) return;

    // Record locally
    setRatings((prev) => ({ ...prev, [currentCard.id]: confidence }));

    // Send to backend
    try {
      fetch(`/api/practice/${kitId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flashcardId: currentCard.id, confidence }),
      });
    } catch (err) {
      console.error('Failed to record confidence rating:', err);
    }

    // Move to next card or complete
    if (currentIndex + 1 < cards.length) {
      setIsFlipped(false);
      setCurrentIndex((prev) => prev + 1);
    } else {
      setSessionCompleted(true);
    }
  };

  const restartSession = (prioritizeHard: boolean = true) => {
    if (prioritizeHard) {
      const sorted = [...cards].sort((a, b) => (ratings[a.id] || 0) - (ratings[b.id] || 0));
      setCards(sorted);
    }
    setCurrentIndex(0);
    setIsFlipped(false);
    setRatings({});
    setSessionCompleted(false);
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
        <Navbar />
        <div className="container-main" style={{ padding: '60px 24px', maxWidth: 700, margin: '0 auto' }}>
          <div className="skeleton" style={{ height: 350, borderRadius: 'var(--radius-lg)' }} />
        </div>
      </div>
    );
  }

  if (!cards.length) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
        <Navbar />
        <div className="container-main" style={{ padding: '80px 24px', textAlign: 'center' }}>
          <h3>No flashcards found in this kit</h3>
          <Link href={`/kits/${kitId}`} className="btn-primary" style={{ marginTop: 20 }}>
            Back to Kit Builder
          </Link>
        </div>
      </div>
    );
  }

  const currentCard = cards[currentIndex];
  const progressPercent = Math.round(((currentIndex + (sessionCompleted ? 1 : 0)) / cards.length) * 100);

  // Stats calculation
  const ratedValues = Object.values(ratings);
  const avgConfidence = ratedValues.length
    ? (ratedValues.reduce((a, b) => a + b, 0) / ratedValues.length).toFixed(1)
    : '0';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      <main style={{ flex: 1, padding: '32px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ width: '100%', maxWidth: 720 }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <Link
              href={`/kits/${kitId}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                color: 'var(--text-secondary)',
                textDecoration: 'none',
                fontSize: 14,
              }}
            >
              <ChevronLeft size={16} /> Back to Kit
            </Link>

            <span className="badge badge-purple">
              {kit?.companyName} • Flashcard Stepper
            </span>
          </div>

          {/* Progress Bar */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
              <span>Card {currentIndex + 1} of {cards.length}</span>
              <span>{progressPercent}% Complete</span>
            </div>
            <div style={{ width: '100%', height: 6, background: 'var(--bg-secondary)', borderRadius: 3, overflow: 'hidden' }}>
              <div
                style={{
                  width: `${progressPercent}%`,
                  height: '100%',
                  background: 'var(--gradient-primary)',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </div>

          {/* Main Flashcard or Session Completion */}
          {!sessionCompleted ? (
            <div>
              {/* Flashcard container */}
              <div
                onClick={() => setIsFlipped(!isFlipped)}
                style={{
                  minHeight: 360,
                  background: 'var(--bg-card)',
                  border: isFlipped ? '1px solid var(--accent-blue)' : '1px solid var(--border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: 36,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  boxShadow: isFlipped ? 'var(--shadow-glow)' : 'var(--shadow-card)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  position: 'relative',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <span className="badge badge-cyan">{currentCard.category}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      Press [Space] or click to flip
                    </span>
                  </div>

                  <div style={{ textAlign: 'center', padding: '24px 0' }}>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 12 }}>
                      {isFlipped ? 'Answer / Explanation' : 'Prompt / Concept'}
                    </div>

                    <h2 style={{
                      fontSize: 22,
                      fontWeight: 700,
                      color: isFlipped ? 'var(--accent-blue-hover)' : 'var(--text-primary)',
                      lineHeight: 1.5,
                    }}>
                      {isFlipped ? currentCard.back : currentCard.front}
                    </h2>
                  </div>
                </div>

                <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <Eye size={15} />
                  {isFlipped ? 'Click again to see question' : 'Click anywhere to reveal answer'}
                </div>
              </div>

              {/* Confidence Rating Controls (visible only after reveal) */}
              {isFlipped ? (
                <div className="fade-in" style={{ marginTop: 28, textAlign: 'center' }}>
                  <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 14 }}>
                    How well did you know this? (Hotkeys: 1 to 5)
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
                    <button
                      onClick={() => handleRate(1)}
                      className="btn-secondary"
                      style={{ flexDirection: 'column', padding: '12px 8px', gap: 4, borderColor: 'rgba(239, 68, 68, 0.4)' }}
                    >
                      <span style={{ fontSize: 18 }}>🔴</span>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>1 - No clue</span>
                    </button>

                    <button
                      onClick={() => handleRate(2)}
                      className="btn-secondary"
                      style={{ flexDirection: 'column', padding: '12px 8px', gap: 4, borderColor: 'rgba(245, 158, 11, 0.4)' }}
                    >
                      <span style={{ fontSize: 18 }}>🟠</span>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>2 - Vague</span>
                    </button>

                    <button
                      onClick={() => handleRate(3)}
                      className="btn-secondary"
                      style={{ flexDirection: 'column', padding: '12px 8px', gap: 4, borderColor: 'rgba(234, 179, 8, 0.4)' }}
                    >
                      <span style={{ fontSize: 18 }}>🟡</span>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>3 - Familiar</span>
                    </button>

                    <button
                      onClick={() => handleRate(4)}
                      className="btn-secondary"
                      style={{ flexDirection: 'column', padding: '12px 8px', gap: 4, borderColor: 'rgba(34, 197, 94, 0.4)' }}
                    >
                      <span style={{ fontSize: 18 }}>🟢</span>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>4 - Good</span>
                    </button>

                    <button
                      onClick={() => handleRate(5)}
                      className="btn-secondary"
                      style={{ flexDirection: 'column', padding: '12px 8px', gap: 4, borderColor: 'rgba(99, 102, 241, 0.4)' }}
                    >
                      <span style={{ fontSize: 18 }}>🌟</span>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>5 - Mastered</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ marginTop: 24, textAlign: 'center' }}>
                  <button
                    onClick={() => setIsFlipped(true)}
                    className="btn-primary"
                    style={{ padding: '12px 32px', fontSize: 15 }}
                  >
                    <Eye size={16} /> Reveal Answer
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Session Completed Screen */
            <div className="fade-in" style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: 40,
              textAlign: 'center',
            }}>
              <div style={{
                width: 64, height: 64, borderRadius: '50%',
                background: 'rgba(34, 197, 94, 0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 20px',
              }}>
                <Award size={32} color="var(--accent-green)" />
              </div>

              <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Session Completed!</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: 15, marginBottom: 32 }}>
                Great work! You reviewed all {cards.length} cards in this deck.
              </p>

              {/* Stats Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 16,
                background: 'var(--bg-secondary)',
                padding: 20,
                borderRadius: 'var(--radius)',
                marginBottom: 32,
              }}>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Cards Reviewed</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', marginTop: 4 }}>
                    {cards.length}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Avg. Confidence</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--accent-blue-hover)', marginTop: 4 }}>
                    {avgConfidence} / 5
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Mastered (4-5★)</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--accent-green)', marginTop: 4 }}>
                    {ratedValues.filter((v) => v >= 4).length}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
                <button
                  onClick={() => restartSession(true)}
                  className="btn-secondary"
                  style={{ padding: '12px 24px' }}
                >
                  <RotateCcw size={16} />
                  Practice Again (Weakest First)
                </button>

                <Link
                  href={`/kits/${kitId}`}
                  className="btn-primary"
                  style={{ padding: '12px 24px', textDecoration: 'none' }}
                >
                  Return to Builder
                  <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
