"use client";
import React, { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Flag, Lightbulb, Volume2, Mic, MicOff, Video, Users, Shield, TrendingUp, AlertTriangle, Camera, Mic2, BookOpen, MessageSquare, ChevronUp, ChevronDown } from 'lucide-react';
import dynamic from 'next/dynamic';
import useSpeechToText from 'react-hook-speech-to-text';
import { toast } from 'sonner';
import { useUser } from '@/context/AuthContext';
import { sendMessage } from '@/utils/Geminimodel';
import Image from 'next/image';
import { analyzeConfidence, getConfidenceColor, getConfidenceBgColor } from '@/utils/confidenceAnalyzer';
import { captureFrame, analyzeVideoFrame, getVideoScoreColor, getVideoScoreBgColor, getCheckStatusIcon } from '@/utils/videoAnalyzer';

const Webcam = dynamic(() => import('react-webcam'), { ssr: false });

/* ─────────────────────── Pre-defined non-technical questions ─────────────────────── */
const NON_TECHNICAL_QUESTIONS = [
  {
    question: "Tell me about yourself. Give a brief introduction covering your background, skills, and what drives you.",
    tip: "Structure your answer: Present → Past → Future. Keep it under 2 minutes.",
    category: "Introduction",
  },
  {
    question: "What are your greatest strengths and how have they helped you in your career or studies?",
    tip: "Pick 2-3 strengths and back each one with a short real example.",
    category: "Self-Awareness",
  },
  {
    question: "What is your biggest weakness and what steps are you taking to improve it?",
    tip: "Be honest but strategic. Show self-awareness and a growth mindset.",
    category: "Self-Awareness",
  },
  {
    question: "Where do you see yourself in the next 5 years?",
    tip: "Align your goals with the kind of role you're targeting. Show ambition with realism.",
    category: "Career Goals",
  },
  {
    question: "Why should we hire you? What makes you stand out from other candidates?",
    tip: "Connect your unique skills and experiences directly to what the role needs.",
    category: "Confidence",
  },
  {
    question: "Tell me about a challenging situation you faced and how you handled it.",
    tip: "Use the STAR method: Situation → Task → Action → Result.",
    category: "Problem Solving",
  },
  {
    question: "How do you handle stress and pressure in a work or academic environment?",
    tip: "Give a specific example showing your coping strategies and positive outcome.",
    category: "Stress Management",
  },
  {
    question: "Describe a time when you worked in a team. What was your role and how did you contribute to its success?",
    tip: "Highlight collaboration, communication, and your specific contribution.",
    category: "Teamwork",
  },
];

/* ─────────────────────────────────────────────────────────────────────────────────── */

function BasicPractice() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [webcamError, setWebcamError] = useState('');
  const [feedbackList, setFeedbackList] = useState([]);
  const [showFeedback, setShowFeedback] = useState(false);
  const [recordingStartTime, setRecordingStartTime] = useState(null);
  const { user } = useUser();

  const webcamRef = React.useRef(null);
  const videoFeedbackRef = React.useRef(null);
  const processedResultsRef = React.useRef(0);
  const intentionalStopRef = React.useRef(false);
  const wantRecordingRef = React.useRef(false);
  const hasSubmittedRef = React.useRef(false);

  const {
    error: speechError,
    interimResult,
    isRecording,
    results,
    startSpeechToText,
    stopSpeechToText,
    setResults,
  } = useSpeechToText({
    continuous: true,
    useLegacyResults: false,
    interimResults: true,
    speechRecognitionProperties: {
      lang: 'en-US',
      maxAlternatives: 1,
    },
  });

  // Show speech recognition errors
  useEffect(() => {
    if (speechError) {
      console.error('[Speech] Recognition error:', speechError);
      toast.error('Microphone error: ' + speechError, { duration: 4000 });
    }
  }, [speechError]);

  /* ── Accumulate only NEW speech results (prevents duplicates) ── */
  useEffect(() => {
    if (results && results.length > processedResultsRef.current) {
      const newResults = results.slice(processedResultsRef.current);
      const newText = newResults
        .map((r) => r?.transcript)
        .filter(Boolean)
        .join(' ');
      if (newText) {
        setUserAnswer((prev) => (prev ? prev + ' ' + newText : newText));
      }
      processedResultsRef.current = results.length;
    }
  }, [results]);

  /* ── Auto-restart if speech recognition silently stops while we still want recording ── */
  useEffect(() => {
    if (!isRecording && wantRecordingRef.current && !intentionalStopRef.current) {
      console.warn('[Speech] Recognition stopped unexpectedly — restarting…');
      const timer = setTimeout(() => {
        if (wantRecordingRef.current) {
          try {
            startSpeechToText();
          } catch (e) {
            console.error('[Speech] Failed to restart:', e);
          }
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isRecording]);

  /* ── Auto-submit answer when recording intentionally stops ── */
  useEffect(() => {
    if (!isRecording && intentionalStopRef.current && userAnswer.length > 10 && !hasSubmittedRef.current) {
      hasSubmittedRef.current = true;
      intentionalStopRef.current = false;
      submitAnswer();
    }
  }, [isRecording]);

  useEffect(() => {
    if (isRecording) {
      toast.info('Speak clearly — answer should be more than 10 characters');
    }
  }, [isRecording]);

  /* ── Toggle recording (with video capture) ── */
  const toggleRecording = async () => {
    if (isRecording) {
      setLoading(true);
      // Mark as intentional stop so auto-restart doesn't kick in
      intentionalStopRef.current = true;
      wantRecordingRef.current = false;
      // Capture & analyze video frame right before stopping
      try {
        const frame = captureFrame(webcamRef);
        if (frame) {
          const vf = await analyzeVideoFrame(frame);
          videoFeedbackRef.current = vf;
        }
      } catch (err) {
        console.error('Video analysis error:', err);
      }
      stopSpeechToText();
      setLoading(false);
    } else {
      // Reset state for a fresh recording
      processedResultsRef.current = 0;
      intentionalStopRef.current = false;
      wantRecordingRef.current = true;
      hasSubmittedRef.current = false;
      setRecordingStartTime(Date.now());
      videoFeedbackRef.current = null;
      startSpeechToText();
    }
  };

  /* ── Get AI feedback for current answer ── */
  const submitAnswer = async () => {
    setLoading(true);
    const currentQ = NON_TECHNICAL_QUESTIONS[activeIndex];

    // ── Confidence Analysis ──
    const durationSec = recordingStartTime ? (Date.now() - recordingStartTime) / 1000 : null;
    const confidence = analyzeConfidence(userAnswer, durationSec);
    const videoData = videoFeedbackRef.current;

    const prompt = `You are an experienced HR interviewer evaluating a candidate's spoken answer to a non-technical interview question. Be liberal and forgiving in your evaluation.

Question: "${currentQ.question}"
Category: ${currentQ.category}
Candidate's Answer: "${userAnswer}"

Speech confidence analysis: Score ${confidence.score}/100 (${confidence.level}), ${confidence.metrics.fillerCount} filler words, ${confidence.metrics.hedgeCount} hedging phrases, ${confidence.metrics.assertiveCount} assertive phrases, vocab richness ${confidence.metrics.vocabRichness}%, ${confidence.metrics.wordCount} total words, ${confidence.metrics.sentenceCount} sentences${confidence.metrics.pace ? `, pace: ${confidence.metrics.pace} words/sec` : ''}.

EVALUATION GUIDELINES — be generous and understanding:
- Non-technical questions are personal and open-ended. Accept ANY valid interpretation or approach.
- The candidate is speaking, not writing — expect informal phrasing, incomplete sentences, and less structure. Do NOT penalize spoken language style.
- If the candidate provides relevant personal experience, even partially, give credit.
- Accept high-level answers just as much as detailed ones — both are valid.
- Do NOT require perfect STAR method or perfect structure. Practical and sincere answers matter more.
- If the answer is in the right direction but incomplete, rate it favorably (5+) and suggest what could be added.
- Only give low ratings (1-3) if the answer is fundamentally wrong, completely off-topic, or essentially empty.
- A rating of 7+ should be given if the candidate clearly addresses the question with genuine thought, even if they miss minor details.

Return your evaluation as JSON only with these fields:
- rating (1-10): Be generous — reward sincerity and relevance over perfection
- feedback: Constructive and encouraging. Comment on content quality AND delivery confidence. Mention what was good before suggesting improvements.
- speechTips: An array of 2-3 specific tips on how the candidate should improve their speaking style (pace, tone, structure, word choice). Be detailed and actionable.

JSON format only, no extra text.`;

    try {
      const result = await sendMessage(prompt);
      let responseText = await result.response.text();
      responseText = responseText.trim().replace(/```json/g, '').replace(/```/g, '').replace(/[\u0000-\u001F]+/g, '');

      let parsed;
      try {
        parsed = JSON.parse(responseText);
      } catch {
        toast.error('Could not parse AI feedback. Please try again.');
        setLoading(false);
        return;
      }

      setFeedbackList((prev) => {
        const updated = [...prev];
        updated[activeIndex] = {
          question: currentQ.question,
          category: currentQ.category,
          answer: userAnswer,
          feedback: parsed.feedback,
          rating: parsed.rating,
          confidence,
          video: videoData ? { score: videoData.score, level: videoData.level, checks: videoData.checks, tips: videoData.tips } : null,
          speechTips: parsed.speechTips || [],
        };
        return updated;
      });

      toast.success('Answer recorded & feedback ready!');
    } catch (err) {
      console.error('Feedback error:', err);
      toast.error('Something went wrong getting feedback.');
    }

    setUserAnswer('');
    setResults([]);
    processedResultsRef.current = 0;
    hasSubmittedRef.current = false;
    setLoading(false);
  };

  /* ── Text-to-speech for questions ── */
  const speakQuestion = (text) => {
    if ('speechSynthesis' in window) {
      const speech = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(speech);
    } else {
      toast.error('Text-to-speech not supported in your browser.');
    }
  };

  const handleWebcamError = () => {
    setWebcamError('Could not access webcam. Check permissions.');
    toast.error('Webcam not available.');
  };

  const getRatingColor = (r) => {
    const rating = parseFloat(r) || 0;
    if (rating >= 8) return 'text-[#4a6b5b]';
    if (rating >= 5) return 'text-[#2d5f5f]';
    return 'text-[#b91c1c]';
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-[#16a34a]';
    if (score >= 60) return 'text-[#2d5f5f]';
    if (score >= 40) return 'text-[#d97706]';
    return 'text-[#b91c1c]';
  };

  const getScoreBg = (score) => {
    if (score >= 80) return 'bg-[#dcfce7] border-[#bbf7d0] text-[#16a34a]';
    if (score >= 60) return 'bg-[#e0f2f1] border-[#b2dfdb] text-[#2d5f5f]';
    if (score >= 40) return 'bg-[#fef3c7] border-[#fde68a] text-[#d97706]';
    return 'bg-[#fef2f2] border-[#fecaca] text-[#b91c1c]';
  };

  const getBarColor = (score) => {
    if (score >= 80) return '#16a34a';
    if (score >= 60) return '#2d5f5f';
    if (score >= 40) return '#d97706';
    return '#b91c1c';
  };

  const getStatusIcon = (status) => {
    if (status === 'good') return '✅';
    if (status === 'info') return 'ℹ️';
    if (status === 'warning') return '⚠️';
    if (status === 'poor') return '❌';
    return '•';
  };

  const statusPriority = (status) => {
    if (status === 'poor') return 3;
    if (status === 'warning') return 2;
    if (status === 'info') return 1;
    return 0;
  };

  const getConfidenceLabel = (score) => {
    if (score >= 80) return 'Very High';
    if (score >= 60) return 'High';
    if (score >= 40) return 'Moderate';
    if (score >= 20) return 'Low';
    return 'Very Low';
  };

  const getVideoLabel = (score) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Needs Improvement';
  };

  const averageRating = feedbackList.length > 0
    ? (feedbackList.reduce((sum, f) => sum + (parseFloat(f?.rating) || 0), 0) / feedbackList.filter(Boolean).length).toFixed(1)
    : 0;

  /* ── Session-level aggregation ── */
  const sessionStats = useMemo(() => {
    const answered = feedbackList.filter(Boolean);
    if (answered.length === 0) return null;

    let totalConfidence = 0, confCount = 0;
    let totalVideo = 0, videoCount = 0;
    let totalWords = 0, totalFillers = 0, totalHedges = 0, totalAssertive = 0, totalRepetitions = 0;
    const allSpeechCoaching = {};
    const allVideoChecks = {};
    const allSpeechTips = [];
    const allConfidenceTips = [];

    answered.forEach((fb) => {
      if (fb.confidence) {
        totalConfidence += fb.confidence.score;
        confCount++;
        if (fb.confidence.metrics) {
          totalWords += fb.confidence.metrics.wordCount || 0;
          totalFillers += fb.confidence.metrics.fillerCount || 0;
          totalHedges += fb.confidence.metrics.hedgeCount || 0;
          totalAssertive += fb.confidence.metrics.assertiveCount || 0;
          totalRepetitions += fb.confidence.metrics.repetitionCount || 0;
        }
        if (fb.confidence.tips) {
          fb.confidence.tips.forEach((t) => {
            if (!allConfidenceTips.includes(t)) allConfidenceTips.push(t);
          });
        }
        if (fb.confidence.speechCoaching) {
          Object.entries(fb.confidence.speechCoaching).forEach(([key, val]) => {
            if (!allSpeechCoaching[key] || statusPriority(val.status) > statusPriority(allSpeechCoaching[key].status)) {
              allSpeechCoaching[key] = val;
            }
          });
        }
      }

      if (fb.video) {
        totalVideo += fb.video.score;
        videoCount++;
        if (fb.video.checks) {
          Object.entries(fb.video.checks).forEach(([key, val]) => {
            if (!allVideoChecks[key] || statusPriority(val.status) > statusPriority(allVideoChecks[key].status)) {
              allVideoChecks[key] = val;
            }
          });
        }
      }

      if (fb.speechTips) {
        fb.speechTips.forEach((t) => {
          if (!allSpeechTips.includes(t)) allSpeechTips.push(t);
        });
      }
    });

    return {
      avgConfidence: confCount > 0 ? Math.round(totalConfidence / confCount) : null,
      avgVideo: videoCount > 0 ? Math.round(totalVideo / videoCount) : null,
      totalWords,
      totalFillers,
      totalHedges,
      totalAssertive,
      totalRepetitions,
      questionCount: answered.length,
      speechCoaching: allSpeechCoaching,
      videoChecks: allVideoChecks,
      speechTips: allSpeechTips.slice(0, 6),
      confidenceTips: allConfidenceTips.slice(0, 8),
    };
  }, [feedbackList]);

  /* ═══════════════════════ Feedback Summary View ═══════════════════════ */
  if (showFeedback) {
    return (
      <div className='min-h-screen bg-gradient-to-b from-[#faf6f1] via-[#f5ebe0] to-white relative'>
        <div className='absolute top-20 right-10 w-72 h-72 bg-[#c5d5d0] rounded-full mix-blend-multiply filter blur-3xl opacity-20 pointer-events-none' />
        <div className='absolute bottom-20 left-10 w-96 h-96 bg-[#f4cdb8] rounded-full mix-blend-multiply filter blur-3xl opacity-20 pointer-events-none' style={{ animationDelay: '2s' }} />

        <div className='relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8'>
          {/* Header */}
          <div className='bg-white/80 backdrop-blur-xl rounded-[32px] p-8 shadow-soft border-2 border-[#e5d5c8] text-center space-y-4'>
            <div className='w-20 h-20 mx-auto bg-gradient-to-br from-[#4a6b5b] to-[#2d4a3d] rounded-[40%_60%_50%_50%/60%_40%_60%_40%] flex items-center justify-center shadow-soft'>
              <Users className='w-10 h-10 text-white' />
            </div>
            <h1 className='text-3xl md:text-4xl font-display font-normal text-[#1a4d4d]'>Non-Technical Practice Complete!</h1>
            <p className='text-[#4b5563] text-lg font-light'>Here&apos;s your performance summary</p>

            {feedbackList.filter(Boolean).length > 0 && (
              <div className='inline-flex items-center gap-3 bg-[#f5ebe0] px-6 py-3 rounded-full border-2 border-[#e5d5c8]'>
                <span className='text-2xl font-display font-normal text-[#1a4d4d]'>
                  {averageRating}<span className='text-base text-[#6b7280]'>/10</span>
                </span>
                <span className='text-sm text-[#6b7280] font-light'>Overall Rating</span>
              </div>
            )}
          </div>

          {/* ═══════════════════════════════════════════════════════ */}
          {/* SESSION-LEVEL SUMMARY CARDS                             */}
          {/* ═══════════════════════════════════════════════════════ */}
          {sessionStats && (
            <>
              {/* Score overview cards */}
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                {/* Confidence Score Card */}
                {sessionStats.avgConfidence !== null && (
                  <div className='bg-white/80 backdrop-blur-xl rounded-[24px] p-6 shadow-soft border-2 border-[#e5d5c8] space-y-3'>
                    <div className='flex items-center gap-2'>
                      <Shield className='w-5 h-5 text-[#4a6b5b]' />
                      <h3 className='text-base font-medium text-[#1a4d4d]'>Avg. Confidence Score</h3>
                    </div>
                    <div className='flex items-center justify-between'>
                      <span className={`text-3xl font-display font-semibold ${getScoreColor(sessionStats.avgConfidence)}`}>
                        {sessionStats.avgConfidence}/100
                      </span>
                      <span className={`text-sm font-medium px-3 py-1 rounded-full border ${getScoreBg(sessionStats.avgConfidence)}`}>
                        {getConfidenceLabel(sessionStats.avgConfidence)}
                      </span>
                    </div>
                    <div className='w-full h-3 bg-[#f5ebe0] rounded-full overflow-hidden'>
                      <div className='h-full rounded-full transition-all duration-700' style={{ width: `${sessionStats.avgConfidence}%`, backgroundColor: getBarColor(sessionStats.avgConfidence) }} />
                    </div>
                    <div className='flex justify-between text-xs text-[#6b7280]'>
                      <span>{sessionStats.totalWords} total words</span>
                      <span>{sessionStats.totalFillers} filler words</span>
                    </div>
                  </div>
                )}

                {/* Video Score Card */}
                {sessionStats.avgVideo !== null && (
                  <div className='bg-white/80 backdrop-blur-xl rounded-[24px] p-6 shadow-soft border-2 border-[#e5d5c8] space-y-3'>
                    <div className='flex items-center gap-2'>
                      <Camera className='w-5 h-5 text-[#4a6b5b]' />
                      <h3 className='text-base font-medium text-[#1a4d4d]'>Avg. Presentation Score</h3>
                    </div>
                    <div className='flex items-center justify-between'>
                      <span className={`text-3xl font-display font-semibold ${getScoreColor(sessionStats.avgVideo)}`}>
                        {sessionStats.avgVideo}/100
                      </span>
                      <span className={`text-sm font-medium px-3 py-1 rounded-full border ${getScoreBg(sessionStats.avgVideo)}`}>
                        {getVideoLabel(sessionStats.avgVideo)}
                      </span>
                    </div>
                    <div className='w-full h-3 bg-[#f5ebe0] rounded-full overflow-hidden'>
                      <div className='h-full rounded-full transition-all duration-700' style={{ width: `${sessionStats.avgVideo}%`, backgroundColor: getBarColor(sessionStats.avgVideo) }} />
                    </div>
                  </div>
                )}
              </div>

              {/* Confidence & Delivery Feedback */}
              {sessionStats.avgConfidence !== null && (
                <div className='bg-white/80 backdrop-blur-xl rounded-[32px] p-6 shadow-soft border-2 border-[#e5d5c8] space-y-4'>
                  <h3 className='text-lg font-medium text-[#1a4d4d] flex items-center gap-2'>
                    <Shield className='w-5 h-5 text-[#4a6b5b]' />
                    Confidence & Delivery Feedback
                  </h3>

                  {/* Session metrics grid */}
                  <div className='grid grid-cols-2 sm:grid-cols-5 gap-3'>
                    <div className='bg-[#f5ebe0] rounded-[16px] p-3 text-center'>
                      <p className='text-xs text-[#6b7280] font-medium'>Total Words</p>
                      <p className='text-lg font-semibold text-[#1a4d4d]'>{sessionStats.totalWords}</p>
                    </div>
                    <div className='bg-[#f5ebe0] rounded-[16px] p-3 text-center'>
                      <p className='text-xs text-[#6b7280] font-medium'>Filler Words</p>
                      <p className={`text-lg font-semibold ${sessionStats.totalFillers > sessionStats.questionCount * 3 ? 'text-[#b91c1c]' : 'text-[#1a4d4d]'}`}>{sessionStats.totalFillers}</p>
                    </div>
                    <div className='bg-[#f5ebe0] rounded-[16px] p-3 text-center'>
                      <p className='text-xs text-[#6b7280] font-medium'>Hedging</p>
                      <p className={`text-lg font-semibold ${sessionStats.totalHedges > sessionStats.questionCount * 2 ? 'text-[#d97706]' : 'text-[#1a4d4d]'}`}>{sessionStats.totalHedges}</p>
                    </div>
                    <div className='bg-[#f5ebe0] rounded-[16px] p-3 text-center'>
                      <p className='text-xs text-[#6b7280] font-medium'>Assertive</p>
                      <p className={`text-lg font-semibold ${sessionStats.totalAssertive >= sessionStats.questionCount ? 'text-[#16a34a]' : 'text-[#d97706]'}`}>{sessionStats.totalAssertive}</p>
                    </div>
                    <div className='bg-[#f5ebe0] rounded-[16px] p-3 text-center'>
                      <p className='text-xs text-[#6b7280] font-medium'>Repetitions</p>
                      <p className={`text-lg font-semibold ${sessionStats.totalRepetitions > sessionStats.questionCount ? 'text-[#b91c1c]' : 'text-[#1a4d4d]'}`}>{sessionStats.totalRepetitions}</p>
                    </div>
                  </div>

                  {/* Confidence tips */}
                  {sessionStats.confidenceTips.length > 0 && (
                    <div className='space-y-2 pt-2'>
                      <p className='text-sm font-medium text-[#1a4d4d]'>How to improve your delivery:</p>
                      {sessionStats.confidenceTips.map((tip, i) => (
                        <div key={i} className='flex items-start gap-2'>
                          {sessionStats.avgConfidence >= 70 ? (
                            <TrendingUp className='w-4 h-4 text-[#16a34a] mt-0.5 flex-shrink-0' />
                          ) : (
                            <AlertTriangle className='w-4 h-4 text-[#d97706] mt-0.5 flex-shrink-0' />
                          )}
                          <p className='text-sm text-[#4b5563] leading-relaxed'>{tip}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Camera & Presentation Feedback */}
              {Object.keys(sessionStats.videoChecks).length > 0 && (
                <div className='bg-white/80 backdrop-blur-xl rounded-[32px] p-6 shadow-soft border-2 border-[#e5d5c8] space-y-4'>
                  <h3 className='text-lg font-medium text-[#1a4d4d] flex items-center gap-2'>
                    <Video className='w-5 h-5 text-[#4a6b5b]' />
                    Camera & Presentation Feedback
                  </h3>
                  <div className='space-y-3'>
                    {Object.entries(sessionStats.videoChecks).map(([key, check]) => (
                      <div key={key} className='bg-[#f5ebe0] rounded-[16px] p-3'>
                        <div className='flex items-center gap-2 mb-1'>
                          <span className='text-base'>{getStatusIcon(check.status)}</span>
                          <span className='text-sm font-semibold text-[#1a4d4d] capitalize'>
                            {key.replace(/([A-Z])/g, ' $1').trim()}
                          </span>
                        </div>
                        <p className='text-sm text-[#4b5563] leading-relaxed ml-7'>{check.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Speech Coaching */}
              {Object.keys(sessionStats.speechCoaching).length > 0 && (
                <div className='bg-white/80 backdrop-blur-xl rounded-[32px] p-6 shadow-soft border-2 border-[#e5d5c8] space-y-4'>
                  <h3 className='text-lg font-medium text-[#1a4d4d] flex items-center gap-2'>
                    <Mic2 className='w-5 h-5 text-[#4a6b5b]' />
                    Detailed Speech Coaching
                  </h3>
                  <div className='space-y-3'>
                    {Object.entries(sessionStats.speechCoaching).map(([key, item]) => (
                      <div key={key} className='bg-[#f5ebe0] rounded-[16px] p-3'>
                        <div className='flex items-center gap-2 mb-1'>
                          <span className='text-base'>{getStatusIcon(item.status)}</span>
                          <span className='text-sm font-semibold text-[#1a4d4d] capitalize'>
                            {key.replace(/([A-Z])/g, ' $1').replace(/And/g, '&').trim()}
                          </span>
                        </div>
                        <p className='text-sm text-[#4b5563] leading-relaxed ml-7'>{item.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Speech Tips */}
              {sessionStats.speechTips.length > 0 && (
                <div className='bg-white/80 backdrop-blur-xl rounded-[32px] p-6 shadow-soft border-2 border-[#e5d5c8] space-y-4'>
                  <h3 className='text-lg font-medium text-[#1a4d4d] flex items-center gap-2'>
                    <BookOpen className='w-5 h-5 text-[#4a6b5b]' />
                    AI Speech Improvement Tips
                  </h3>
                  <div className='space-y-2'>
                    {sessionStats.speechTips.map((tip, i) => (
                      <div key={i} className='flex items-start gap-2'>
                        <TrendingUp className='w-4 h-4 text-[#2d5f5f] mt-0.5 flex-shrink-0' />
                        <p className='text-sm text-[#4b5563] leading-relaxed'>{tip}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ═══════════════════════════════════════════════════════ */}
          {/* PER-QUESTION BREAKDOWN                                  */}
          {/* ═══════════════════════════════════════════════════════ */}
          <div className='space-y-4'>
            <h2 className='text-xl font-medium text-[#1a4d4d]'>Question-by-Question Breakdown</h2>
            {NON_TECHNICAL_QUESTIONS.map((q, i) => {
              const fb = feedbackList[i];
              return (
                <div key={i} className='bg-white/80 backdrop-blur-xl rounded-[20px] p-6 shadow-soft border-2 border-[#e5d5c8] space-y-3'>
                  <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-3'>
                      <span className='w-8 h-8 rounded-full bg-[#2d5f5f] text-white text-sm font-semibold flex items-center justify-center'>{i + 1}</span>
                      <span className='text-xs font-medium text-[#4a6b5b] bg-[#f5ebe0] px-2.5 py-1 rounded-full'>{q.category}</span>
                    </div>
                    {fb ? (
                      <div className='flex items-center gap-3'>
                        {fb.confidence && (
                          <span className={`text-xs font-medium px-2.5 py-1 rounded-full border flex items-center gap-1 ${getScoreBg(fb.confidence.score)}`}>
                            <Shield className='w-3 h-3' />
                            {fb.confidence.score}%
                          </span>
                        )}
                        <span className={`font-display font-semibold text-lg ${getRatingColor(fb.rating)}`}>{fb.rating}/10</span>
                      </div>
                    ) : (
                      <span className='text-sm text-[#9ca3af] italic'>Not answered</span>
                    )}
                  </div>

                  <p className='text-[#1a4d4d] font-medium'>{q.question}</p>

                  {fb && (
                    <>
                      <div className='bg-[#f5ebe0] p-4 rounded-[16px] border border-[#e5d5c8]'>
                        <div className='flex items-center gap-2 mb-1'>
                          <MessageSquare className='w-4 h-4 text-[#6b7280]' />
                          <p className='text-sm text-[#6b7280] font-medium'>Your Answer</p>
                        </div>
                        <p className='text-[#1f2937] text-sm leading-relaxed'>{fb.answer}</p>
                      </div>
                      <div className='bg-gradient-to-br from-[#f4cdb8]/40 to-[#f5ddd1]/40 p-4 rounded-[16px] border border-[#e8b4a8]/60'>
                        <p className='text-sm text-[#4a6b5b] font-medium mb-1'>AI Feedback</p>
                        <p className='text-[#4b5563] text-sm leading-relaxed'>{fb.feedback}</p>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          <div className='flex justify-center pt-4'>
            <Link href='/dashboard'>
              <Button className='rounded-[28px] bg-[#2d5f5f] hover:bg-[#1a4d4d] text-white font-medium shadow-soft hover:shadow-md transition-all duration-300 px-8'>
                <ArrowLeft className='w-4 h-4 mr-2' />
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  /* ═══════════════════════ Practice Session View ═══════════════════════ */
  const [showQuestion, setShowQuestion] = useState(true);

  return (
    <div className='h-screen bg-[#faf6f1] flex items-center justify-center p-6'>
      <div className='relative w-full max-w-5xl overflow-hidden rounded-[28px] bg-[#1a4d4d]'
        style={{ height: 'min(85vh, 760px)', boxShadow: '0 8px 32px rgba(45, 95, 95, 0.18)' }}>
          {/* Webcam feed */}
          {webcamError ? (
            <div className='flex flex-col items-center justify-center h-full p-8 text-center'>
              <div className='w-20 h-20 rounded-full bg-[#f5ebe0]/10 flex items-center justify-center mb-4'>
                <Video className='w-10 h-10 text-[#f5ebe0]/40' />
              </div>
              <p className='text-sm text-[#f5ebe0]/60'>{webcamError}</p>
            </div>
          ) : (
            <>
              <Image src='/webcam.png' width={200} height={200} className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-5' alt='' />
              <Webcam ref={webcamRef} mirrored screenshotFormat="image/jpeg" onUserMediaError={handleWebcamError} className='absolute inset-0 z-10 w-full h-full object-cover' />
            </>
          )}

          {/* ── TOP BAR ── */}
          <div className='absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-5 py-3'>
            <div className='flex items-center gap-3'>
              <Link href='/dashboard' className='text-[#f5ebe0]/60 hover:text-[#f5ebe0] transition-colors'>
                <ArrowLeft className='w-5 h-5' />
              </Link>
              {isRecording && (
                <div className='flex items-center gap-1.5 bg-red-500 text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-sm'>
                  <span className='w-1.5 h-1.5 bg-white rounded-full animate-pulse' />
                  REC
                </div>
              )}
              <span className='text-[#f5ebe0]/80 text-xs font-medium bg-[#1a4d4d]/60 backdrop-blur-sm px-2.5 py-0.5 rounded-full'>
                Q{activeIndex + 1}/{NON_TECHNICAL_QUESTIONS.length}
              </span>
            </div>

            {/* Progress dots */}
            <div className='flex items-center gap-1.5 bg-[#1a4d4d]/50 backdrop-blur-sm px-3 py-1.5 rounded-full'>
              {NON_TECHNICAL_QUESTIONS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveIndex(i)}
                  className={`w-2 h-2 rounded-full transition-all duration-300 cursor-pointer ${
                    i === activeIndex
                      ? 'bg-[#f5ebe0] scale-125'
                      : feedbackList[i]
                        ? 'bg-[#4a6b5b]'
                        : 'bg-[#f5ebe0]/30 hover:bg-[#f5ebe0]/50'
                  }`}
                />
              ))}
            </div>

            <div className='w-16 flex justify-end'>
              {loading && (
                <div className='flex items-center gap-1.5 bg-[#1a4d4d]/60 backdrop-blur-sm px-2.5 py-1 rounded-full text-[#f5ebe0]/70 text-[11px]'>
                  <div className='w-3 h-3 border-2 border-[#f5ebe0]/20 border-t-[#f5ebe0] rounded-full animate-spin' />
                  AI
                </div>
              )}
            </div>
          </div>

          {/* ── QUESTION OVERLAY ── */}
          <div className={`absolute top-14 left-4 right-4 z-30 transition-all duration-300 ${showQuestion ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'}`}>
            <div className='bg-[#1a4d4d]/75 backdrop-blur-xl rounded-[20px] p-4 border border-[#3d7373]/30'
              style={{ boxShadow: '0 4px 20px rgba(45, 95, 95, 0.15)' }}>
              <div className='flex items-start gap-3 mb-2'>
                <span className='text-[10px] font-semibold text-[#c5d5d0] bg-[#4a6b5b]/40 px-2 py-0.5 rounded-full flex-shrink-0'>
                  {NON_TECHNICAL_QUESTIONS[activeIndex].category}
                </span>
              </div>
              <div className='flex items-start justify-between gap-3'>
                <p className='text-[#f5ebe0] text-sm md:text-base font-medium leading-relaxed flex-1'>
                  {NON_TECHNICAL_QUESTIONS[activeIndex].question}
                </p>
                <button
                  onClick={() => speakQuestion(NON_TECHNICAL_QUESTIONS[activeIndex].question)}
                  className='w-8 h-8 bg-[#f5ebe0]/15 hover:bg-[#f5ebe0]/25 rounded-full flex items-center justify-center transition-all flex-shrink-0'
                  title='Listen to question'
                >
                  <Volume2 className='w-3.5 h-3.5 text-[#f5ebe0]/80' />
                </button>
              </div>
              <div className='mt-3 flex items-start gap-2 bg-[#f5ebe0]/5 rounded-[12px] px-3 py-2'>
                <Lightbulb className='w-3 h-3 text-[#f4cdb8]/70 mt-0.5 flex-shrink-0' />
                <p className='text-[11px] text-[#f5ebe0]/50 leading-relaxed'>
                  {NON_TECHNICAL_QUESTIONS[activeIndex].tip}
                </p>
              </div>
            </div>
          </div>

          {/* ── LIVE TRANSCRIPT ── */}
          {(interimResult || userAnswer) && (
            <div className='absolute bottom-28 left-4 right-4 z-30'>
              <div className='bg-[#1a4d4d]/70 backdrop-blur-xl rounded-[12px] px-4 py-3 border border-[#3d7373]/20'>
                <p className='text-[#f5ebe0] text-sm leading-relaxed text-center line-clamp-2'>
                  {interimResult || userAnswer.split(' ').slice(-20).join(' ')}
                </p>
              </div>
            </div>
          )}

          {/* ── BOTTOM CONTROL BAR (inside camera HUD) ── */}
          <div className='absolute bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-[#1a4d4d]/80 via-[#1a4d4d]/40 to-transparent px-5 pb-5 pt-10'>
            <div className='flex items-center justify-between'>
              {/* Left: Prev */}
              <div className='w-24'>
                {activeIndex > 0 && (
                  <button
                    onClick={() => setActiveIndex(activeIndex - 1)}
                    className='flex items-center gap-1.5 text-[#f5ebe0]/70 hover:text-[#f5ebe0] text-sm font-medium transition-all hover:translate-x-[-2px]'
                  >
                    <ArrowLeft className='w-4 h-4' />
                    Prev
                  </button>
                )}
              </div>

              {/* Center: Action buttons */}
              <div className='flex items-center gap-3'>
                {/* Toggle question */}
                <button
                  onClick={() => setShowQuestion(!showQuestion)}
                  className='w-11 h-11 rounded-full bg-[#f5ebe0]/15 hover:bg-[#f5ebe0]/25 backdrop-blur-sm flex items-center justify-center transition-all text-[#f5ebe0]/80 hover:text-[#f5ebe0]'
                  title={showQuestion ? 'Hide question' : 'Show question'}
                >
                  {showQuestion ? <ChevronUp className='w-5 h-5' /> : <ChevronDown className='w-5 h-5' />}
                </button>

                {/* MIC button */}
                <button
                  disabled={loading}
                  onClick={toggleRecording}
                  className={`
                    relative flex items-center justify-center w-16 h-16 rounded-full transition-all duration-300
                    ${isRecording
                      ? 'bg-red-500 hover:bg-red-600 text-white ring-4 ring-red-400/30'
                      : 'bg-[#f5ebe0] hover:bg-[#e5d5c8] text-[#1a4d4d]'
                    }
                    ${loading ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:scale-105'}
                  `}
                  style={{ boxShadow: isRecording ? '0 4px 20px rgba(239,68,68,0.3)' : '0 4px 16px rgba(0,0,0,0.15)' }}
                  title={isRecording ? 'Stop Recording' : 'Start Recording'}
                >
                  {loading ? (
                    <div className='w-6 h-6 border-2 border-current/30 border-t-current rounded-full animate-spin' />
                  ) : isRecording ? (
                    <MicOff className='w-7 h-7' />
                  ) : (
                    <Mic className='w-7 h-7' />
                  )}
                  {isRecording && !loading && (
                    <span className='absolute inset-0 rounded-full border-2 border-red-400 animate-ping opacity-30' />
                  )}
                </button>

                {/* Camera indicator */}
                <button
                  className='w-11 h-11 rounded-full bg-[#f5ebe0]/15 backdrop-blur-sm flex items-center justify-center text-[#f5ebe0]/60 cursor-default'
                  title='Camera active'
                >
                  <Video className='w-5 h-5' />
                </button>
              </div>

              {/* Right: Next/End */}
              <div className='w-24 flex justify-end'>
                {activeIndex < NON_TECHNICAL_QUESTIONS.length - 1 ? (
                  <button
                    onClick={() => setActiveIndex(activeIndex + 1)}
                    className='flex items-center gap-1.5 text-[#f5ebe0]/70 hover:text-[#f5ebe0] text-sm font-medium transition-all hover:translate-x-[2px]'
                  >
                    Next
                    <ArrowRight className='w-4 h-4' />
                  </button>
                ) : (
                  <button
                    onClick={() => setShowFeedback(true)}
                    className='flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white text-sm font-medium px-3 py-1.5 rounded-full transition-all'
                    style={{ boxShadow: '0 2px 8px rgba(239,68,68,0.2)' }}
                  >
                    <Flag className='w-3.5 h-3.5' />
                    End
                  </button>
                )}
              </div>
            </div>

            {/* Status label */}
            <p className={`text-center text-[11px] mt-3 font-medium ${isRecording ? 'text-red-400' : 'text-[#f5ebe0]/40'}`}>
              {loading ? 'Analyzing your answer…' : isRecording ? 'Listening — speak your answer' : 'Tap the mic to start answering'}
            </p>
          </div>
      </div>
    </div>
  );
}

export default BasicPractice;
export { BasicPractice };
