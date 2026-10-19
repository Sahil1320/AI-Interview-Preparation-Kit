'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import {
  ChevronLeft, Upload, FileText, Play, CheckCircle2,
  Clock, Mic, MicOff, Send, Award, AlertCircle, Sparkles,
  ArrowRight, RotateCcw, ShieldCheck, HelpCircle
} from 'lucide-react';

interface Question {
  id: string;
  question: string;
  category: string;
  relatedRequirements: string[];
  timeLimit: number;
}

interface EvaluationResult {
  score: number;
  feedback: string;
}

interface ResumeData {
  skills: string[];
  experience: string[];
  education: string[];
}

export default function MockInterviewPage() {
  const routeParams = useParams();
  const kitId = (routeParams?.id as string) || '';

  // Stages: 'setup' | 'interview' | 'results'
  const [stage, setStage] = useState<'setup' | 'interview' | 'results'>('setup');
  const [kit, setKit] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Resume state
  const [resumeText, setResumeText] = useState('');
  const [analyzingResume, setAnalyzingResume] = useState(false);
  const [resumeData, setResumeData] = useState<ResumeData | null>(null);

  // Interview state
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [timeLeft, setTimeLeft] = useState(120);
  const [timerActive, setTimerActive] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [results, setResults] = useState<Array<{
    question: Question;
    answer: string;
    evaluation: EvaluationResult;
  }>>([]);

  const recognitionRef = useRef<any>(null);
  const baseTextRef = useRef('');
  const isRecordingRef = useRef(false);
  const currentAnswerRef = useRef('');

  const updateAnswer = (text: string) => {
    setCurrentAnswer(text);
    currentAnswerRef.current = text;
  };

  useEffect(() => {
    fetchKit();
  }, [kitId]);

  // Timer countdown (reference pace guide — no forced cutoffs)
  useEffect(() => {
    let interval: any = null;
    if (timerActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerActive, timeLeft]);

  // Speech recognition initialization
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
          let sessionFinal = '';
          let interim = '';
          for (let i = 0; i < event.results.length; i++) {
            const transcript = event.results[i][0]?.transcript || '';
            if (event.results[i].isFinal) {
              sessionFinal += transcript + ' ';
            } else {
              interim += transcript;
            }
          }
          const fullText = (baseTextRef.current + sessionFinal + interim).trim();
          updateAnswer(fullText);
        };

        recognition.onerror = (e: any) => {
          console.warn('Speech recognition warning:', e.error);
          setIsRecording(false);
          isRecordingRef.current = false;
        };

        recognition.onend = () => {
          if (isRecordingRef.current) {
            // Lock in current transcript as baseText for the restarted recognition session
            baseTextRef.current = currentAnswerRef.current ? currentAnswerRef.current.trim() + ' ' : '';
            try {
              recognition.start();
            } catch (err) {
              console.warn('Speech restart note:', err);
              isRecordingRef.current = false;
              setIsRecording(false);
            }
          } else {
            setIsRecording(false);
          }
        };

        recognitionRef.current = recognition;
      }
    }

    return () => {
      stopRecording();
    };
  }, []);

  const stopRecording = () => {
    isRecordingRef.current = false;
    setIsRecording(false);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (err) {
        console.warn('Speech abort note:', err);
      }
    }
  };

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in this browser. Please type your answer.');
      return;
    }

    if (isRecording || isRecordingRef.current) {
      stopRecording();
    } else {
      try {
        baseTextRef.current = currentAnswerRef.current ? currentAnswerRef.current.trim() + ' ' : '';
        isRecordingRef.current = true;
        setIsRecording(true);
        recognitionRef.current.start();
      } catch (e: any) {
        console.error('Failed to start speech recognition:', e);
        stopRecording();
      }
    }
  };

  const fetchKit = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/kits/${kitId}`);
      if (res.ok) {
        const data = await res.json();
        setKit(data.kit);
      }
    } catch (err) {
      console.error('Failed to load kit:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartInterview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resumeText.trim()) return;

    try {
      setAnalyzingResume(true);
      const res = await fetch('/api/mock-interview/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kitId, resumeText }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to analyze resume and generate interview questions.');
        return;
      }

      setResumeData(data.resumeData);
      setQuestions(data.questions || []);
      setCurrentQIndex(0);
      setCurrentAnswer('');
      setTimeLeft(data.questions?.[0]?.timeLimit || 120);
      setTimerActive(true);
      setStage('interview');
    } catch (err) {
      console.error('Error starting interview:', err);
      alert('Failed to start interview.');
    } finally {
      setAnalyzingResume(false);
    }
  };

  const handleAnswerSubmit = async () => {
    setTimerActive(false);
    stopRecording();

    const currentQ = questions[currentQIndex];
    if (!currentQ) return;

    try {
      setEvaluating(true);
      const res = await fetch('/api/mock-interview/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: currentQ.question,
          answer: currentAnswer.trim() || 'No answer provided before time expired.',
          requirement: currentQ.relatedRequirements?.join(', ') || '',
        }),
      });

      const evaluation = await res.json();

      setResults((prev) => [
        ...prev,
        {
          question: currentQ,
          answer: currentAnswer,
          evaluation: {
            score: evaluation.score ?? 5,
            feedback: evaluation.feedback ?? 'Evaluation complete.',
          },
        },
      ]);

      // Ensure recording is stopped before moving to next question
      stopRecording();

      // Move to next question or show final report
      if (currentQIndex + 1 < questions.length) {
        const nextIdx = currentQIndex + 1;
        setCurrentQIndex(nextIdx);
        updateAnswer('');
        baseTextRef.current = '';
        setTimeLeft(questions[nextIdx]?.timeLimit || 120);
        setTimerActive(true);
      } else {
        setStage('results');
      }
    } catch (err) {
      console.error('Failed to evaluate answer:', err);
      alert('Error evaluating answer, proceeding...');
    } finally {
      setEvaluating(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
      const text = await file.text();
      setResumeText(text);
    } else {
      // For PDF or other formats, we can read as text or let user paste
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setResumeText(content);
      };
      reader.readAsText(file);
    }
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

  const overallAvgScore = results.length
    ? (results.reduce((a, b) => a + b.evaluation.score, 0) / results.length).toFixed(1)
    : '0';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      <main style={{ flex: 1, padding: '36px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ width: '100%', maxWidth: 760 }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
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
              <ChevronLeft size={16} /> Back to Kit Builder
            </Link>

            <span className="badge badge-green" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Sparkles size={13} />
              AI Mock Interview Simulation
            </span>
          </div>

          {/* STAGE 1: SETUP (Resume Input) */}
          {stage === 'setup' && (
            <div className="fade-in" style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: 36,
              boxShadow: 'var(--shadow-card)',
            }}>
              <div style={{ textAlign: 'center', marginBottom: 28 }}>
                <div style={{
                  width: 56, height: 56, borderRadius: '50%',
                  background: 'rgba(34, 197, 94, 0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 16px',
                }}>
                  <FileText size={28} color="var(--accent-green)" />
                </div>
                <h2 style={{ fontSize: 24, fontWeight: 800 }}>Resume-Tailored Mock Interview</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 8, maxWidth: 540, margin: '8px auto 0' }}>
                  Provide your resume. The AI will cross-reference your documented skills against the job description for <strong>{kit?.companyName || 'the role'}</strong> and conduct a timed, realistic interview.
                </p>
              </div>

              {analyzingResume ? (
                <div style={{ textAlign: 'center', padding: '40px 16px' }}>
                  <div style={{
                    width: 50, height: 50, borderRadius: '50%',
                    border: '3px solid var(--border)',
                    borderTopColor: 'var(--accent-green)',
                    animation: 'spin 1s linear infinite',
                    margin: '0 auto 20px',
                  }} />
                  <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                  <h4 style={{ fontSize: 16, fontWeight: 600 }}>Analyzing Resume & Mapping Skills...</h4>
                  <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 6 }}>
                    Identifying technical overlap, skill gaps, and generating personalized interview questions...
                  </p>
                </div>
              ) : (
                <form onSubmit={handleStartInterview} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
                        Paste Resume Text or Upload
                      </label>
                      <label style={{
                        fontSize: 12,
                        color: 'var(--accent-blue-hover)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}>
                        <Upload size={13} /> Upload File (.txt, .md, .pdf)
                        <input
                          type="file"
                          accept=".txt,.pdf,.md,.doc"
                          onChange={handleFileUpload}
                          style={{ display: 'none' }}
                        />
                      </label>
                    </div>

                    <textarea
                      required
                      className="textarea-field"
                      rows={10}
                      placeholder="Paste your resume content here (e.g. Work Experience, Skills, Education, Projects)..."
                      value={resumeText}
                      onChange={(e) => setResumeText(e.target.value)}
                    />
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                      {resumeText.length} characters entered
                    </div>
                  </div>

                  <div style={{
                    background: 'var(--bg-secondary)',
                    borderRadius: 'var(--radius)',
                    padding: 16,
                    border: '1px solid var(--border)',
                    fontSize: 13,
                    color: 'var(--text-secondary)',
                  }}>
                    <strong style={{ color: 'var(--text-primary)' }}>What to expect:</strong>
                    <ul style={{ paddingLeft: 20, marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <li>5 to 8 tailored questions addressing your strengths and skill gaps</li>
                      <li>Live countdown timer per question (60-180 seconds) simulating real pressure</li>
                      <li>Voice or text answer entry</li>
                      <li>Instant AI evaluation with 1-10 scoring and actionable constructive feedback</li>
                    </ul>
                  </div>

                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={!resumeText.trim()}
                    style={{
                      padding: '14px 24px',
                      fontSize: 15,
                      justifyContent: 'center',
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                    }}
                  >
                    <Play size={16} />
                    Begin AI Mock Interview
                  </button>
                </form>
              )}
            </div>
          )}

          {/* STAGE 2: LIVE INTERVIEW */}
          {stage === 'interview' && (
            <div className="fade-in">
              {/* Question progress and timer */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 20,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="badge badge-blue">
                    Question {currentQIndex + 1} of {questions.length}
                  </span>
                  <span className="badge badge-purple">
                    {questions[currentQIndex]?.category}
                  </span>
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 14px',
                  borderRadius: 20,
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-secondary)',
                  fontWeight: 600,
                  fontSize: 13,
                }}>
                  <Clock size={15} />
                  <span>
                    {timeLeft > 0
                      ? `${Math.floor(timeLeft / 60)}:${(timeLeft % 60).toString().padStart(2, '0')} (Pace Guide)`
                      : 'No Time Limit • Take your time'}
                  </span>
                </div>
              </div>

              {/* Question Card */}
              <div style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                padding: 32,
                marginBottom: 24,
                boxShadow: 'var(--shadow-card)',
              }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>
                  Interviewer Question
                </div>
                <h3 style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.5, color: 'var(--text-primary)' }}>
                  {questions[currentQIndex]?.question}
                </h3>
              </div>

              {/* Answer Input Area */}
              <div style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                padding: 24,
                boxShadow: 'var(--shadow-card)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Your Answer
                  </label>

                  <div style={{ display: 'flex', gap: 8 }}>
                    {currentAnswer && (
                      <button
                        type="button"
                        onClick={() => {
                          updateAnswer('');
                          baseTextRef.current = '';
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                          fontSize: 12,
                          textDecoration: 'underline',
                        }}
                      >
                        Clear
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={toggleRecording}
                      style={{
                        background: isRecording ? 'rgba(239, 68, 68, 0.2)' : 'var(--bg-secondary)',
                        border: isRecording ? '1px solid var(--accent-red)' : '1px solid var(--border)',
                        color: isRecording ? 'var(--accent-red)' : 'var(--text-secondary)',
                        padding: '6px 12px',
                        borderRadius: 20,
                        cursor: 'pointer',
                        fontSize: 12,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      {isRecording ? <MicOff size={14} /> : <Mic size={14} />}
                      {isRecording ? 'Listening (Click to stop)' : 'Voice Dictation'}
                    </button>
                  </div>
                </div>

                <textarea
                  className="textarea-field"
                  rows={8}
                  disabled={evaluating}
                  placeholder="Speak or type your complete answer without any word or time limit — explain as much detail as you need..."
                  value={currentAnswer}
                  onChange={(e) => {
                    updateAnswer(e.target.value);
                    baseTextRef.current = e.target.value.trim() ? e.target.value.trim() + ' ' : '';
                  }}
                />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {evaluating ? 'AI is evaluating your response...' : 'No time or text limit: speak or type as much as you like, then click Submit Answer.'}
                  </span>

                  <button
                    onClick={handleAnswerSubmit}
                    disabled={evaluating || !currentAnswer.trim()}
                    className="btn-primary"
                    style={{
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      padding: '10px 24px',
                    }}
                  >
                    <Send size={15} />
                    {evaluating ? 'Evaluating...' : 'Submit Answer'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STAGE 3: INTERVIEW RESULTS & FEEDBACK */}
          {stage === 'results' && (
            <div className="fade-in">
              <div style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                padding: 36,
                textAlign: 'center',
                marginBottom: 32,
              }}>
                <div style={{
                  width: 64, height: 64, borderRadius: '50%',
                  background: 'rgba(34, 197, 94, 0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 16px',
                }}>
                  <Award size={32} color="var(--accent-green)" />
                </div>
                <h2 style={{ fontSize: 24, fontWeight: 800 }}>Mock Interview Completed!</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 6 }}>
                  Here is your comprehensive evaluation breakdown and score across all questions.
                </p>

                {/* Score Banner */}
                <div style={{
                  background: 'var(--bg-secondary)',
                  padding: 24,
                  borderRadius: 'var(--radius)',
                  maxWidth: 320,
                  margin: '24px auto',
                  border: '1px solid var(--border)',
                }}>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Overall Performance Score
                  </div>
                  <div style={{ fontSize: 36, fontWeight: 800, color: 'var(--accent-green)', marginTop: 4 }}>
                    {overallAvgScore} / 10
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', gap: 14 }}>
                  <button
                    onClick={() => {
                      stopRecording();
                      setStage('setup');
                      setResults([]);
                      updateAnswer('');
                      baseTextRef.current = '';
                    }}
                    className="btn-secondary"
                  >
                    <RotateCcw size={16} /> Retake Mock Interview
                  </button>

                  <Link href={`/kits/${kitId}`} className="btn-primary" style={{ textDecoration: 'none' }}>
                    Return to Kit Builder
                    <ArrowRight size={16} />
                  </Link>
                </div>
              </div>

              {/* Per-Question Evaluation List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <h3 style={{ fontSize: 18, fontWeight: 700 }}>Question-by-Question Evaluation</h3>

                {results.map((res, i) => (
                  <div
                    key={i}
                    style={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius)',
                      padding: 24,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                      <div>
                        <span className="badge badge-blue" style={{ marginBottom: 6 }}>
                          Question {i + 1} • {res.question.category}
                        </span>
                        <h4 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>
                          {res.question.question}
                        </h4>
                      </div>

                      <div style={{
                        padding: '4px 12px',
                        borderRadius: 16,
                        background: res.evaluation.score >= 7 ? 'rgba(34, 197, 94, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                        color: res.evaluation.score >= 7 ? 'var(--accent-green)' : 'var(--accent-amber)',
                        fontWeight: 700,
                        fontSize: 14,
                        whiteSpace: 'nowrap',
                      }}>
                        Score: {res.evaluation.score} / 10
                      </div>
                    </div>

                    <div style={{
                      background: 'var(--bg-secondary)',
                      padding: 12,
                      borderRadius: 8,
                      fontSize: 13,
                      color: 'var(--text-secondary)',
                      marginBottom: 14,
                    }}>
                      <strong style={{ color: 'var(--text-primary)' }}>Your Answer: </strong>
                      {res.answer || 'No answer submitted.'}
                    </div>

                    <div style={{
                      borderLeft: '3px solid var(--accent-blue)',
                      paddingLeft: 14,
                      fontSize: 13,
                      color: 'var(--text-secondary)',
                      lineHeight: 1.6,
                    }}>
                      <strong style={{ color: 'var(--accent-blue-hover)', display: 'block', marginBottom: 2 }}>
                        AI Feedback & Improvement:
                      </strong>
                      {res.evaluation.feedback}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
