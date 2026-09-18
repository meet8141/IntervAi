"use client";
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import useSpeechToText from 'react-hook-speech-to-text';
import { Mic, MicOff, Video, Shield, TrendingUp, AlertTriangle, Info, Camera, Eye, Sun, MonitorSpeaker, MessageSquare, BookOpen, Volume2, Lightbulb, ArrowLeft, ArrowRight, Flag, ChevronUp, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { useUser } from '@/context/AuthContext';
import { sendMessage } from '@/utils/Geminimodel';
import moment from 'moment';
import { analyzeConfidence, getConfidenceColor, getConfidenceBgColor } from '@/utils/confidenceAnalyzer';
import { captureFrame, analyzeVideoFrame, getVideoScoreColor, getVideoScoreBgColor, getCheckStatusIcon } from '@/utils/videoAnalyzer';
import Link from 'next/link';

const Webcam = dynamic(() => import('react-webcam'), { ssr: false });

function RecordAnswerSection({ mockinterviewquestions, activequestionindex, interviewdata, onPrev, onNext, isFirst, isLast, interviewId }) {
  const [userAnswer, setUserAnswer] = useState('');
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const [webcamError, setWebcamError] = useState('');
  const [recordingStartTime, setRecordingStartTime] = useState(null);
  const webcamRef = React.useRef(null);
  const videoFeedbackRef = React.useRef(null);
  const isSubmittingRef = React.useRef(false);
  const processedResultsRef = React.useRef(0);
  const intentionalStopRef = React.useRef(false);
  const wantRecordingRef = React.useRef(false);
  
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

  // Accumulate only NEW results (prevents duplicates)
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

  // Auto-restart: if speech recognition silently stops while we still want recording
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

  // When recording intentionally stops and we have a substantial answer, submit once
  useEffect(() => {
    if (!isRecording && intentionalStopRef.current && userAnswer.length > 10 && !isSubmittingRef.current) {
      isSubmittingRef.current = true;
      intentionalStopRef.current = false;
      updateUserAnswerInDb().finally(() => {
        isSubmittingRef.current = false;
      });
    }
  }, [isRecording]);

  useEffect(() => {
    if (isRecording) {
      toast.info('Answer should be more than 10 characters');
    }
  }, [isRecording]);

  const saveUserAnswer = async () => {
    if (isRecording) {
      setLoading(true);
      // Mark this as an intentional stop so auto-restart doesn't kick in
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
      // Don't setLoading(false) here — updateUserAnswerInDb will handle it
    } else {
      // Reset state for a fresh recording
      processedResultsRef.current = 0;
      intentionalStopRef.current = false;
      wantRecordingRef.current = true;
      setRecordingStartTime(Date.now());
      videoFeedbackRef.current = null;
      startSpeechToText();
    }
  };

  const updateUserAnswerInDb = async () => {
    if (!interviewdata || !interviewdata.mockid) {
      toast.error("Interview data is not available. Please try again.");
      setLoading(false);
      return;
    }
  
    setLoading(true);

    try {
      // ── Confidence Analysis ──
      const durationSec = recordingStartTime ? (Date.now() - recordingStartTime) / 1000 : null;
      const confidence = analyzeConfidence(userAnswer, durationSec);
      const videoData = videoFeedbackRef.current;

      const feedbackPrompt = `You are a senior technical interviewer evaluating a candidate's spoken answer. Be liberal and forgiving in your evaluation.

Question: ${mockinterviewquestions[activequestionindex]?.question}
Candidate's Answer: ${userAnswer}

Speech confidence analysis: Score ${confidence.score}/100 (${confidence.level}), ${confidence.metrics.fillerCount} filler words, ${confidence.metrics.hedgeCount} hedging phrases, ${confidence.metrics.assertiveCount} assertive phrases, vocab richness ${confidence.metrics.vocabRichness}%, ${confidence.metrics.wordCount} total words, ${confidence.metrics.sentenceCount} sentences${confidence.metrics.pace ? `, pace: ${confidence.metrics.pace} words/sec` : ''}.

EVALUATION GUIDELINES — be generous and understanding:
- Technical questions are often abstract and open-ended. Accept ANY valid interpretation or approach.
- The candidate is speaking, not writing — expect informal phrasing, incomplete sentences, and less structure. Do NOT penalize spoken language style.
- If the candidate demonstrates understanding of the core concept, even partially or through examples/analogies, give credit.
- Accept high-level/abstract explanations just as much as detailed/specific ones — both are valid.
- Do NOT require exact terminology or textbook definitions. Practical understanding matters more.
- If the answer is in the right direction but incomplete, rate it favorably (5+) and suggest what could be added.
- Only give low ratings (1-3) if the answer is fundamentally wrong, completely off-topic, or essentially empty.
- A rating of 7+ should be given if the candidate clearly understands the concept, even if they miss minor details.

Return your evaluation as JSON only with these fields:
- rating (1-10): Be generous — reward understanding over perfection
- feedback: Constructive and encouraging. Comment on content quality AND delivery confidence. Mention what was good before suggesting improvements.
- speechTips: An array of 2-3 specific tips on how the candidate should improve their speaking style (pace, tone, structure, word choice). Be detailed and actionable.
- confidenceScore (${confidence.score})

JSON format only, no extra text.`;
    
      const result = await sendMessage(feedbackPrompt);
      let responseText = await result.response.text();
    
      responseText = responseText.trim()
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .replace(/[\u0000-\u001F]+/g, '');
    
      let jsonResponse;
      try {
        jsonResponse = JSON.parse(responseText);
      } catch (parseError) {
        console.error("Error parsing JSON:", parseError);
        toast.error("There was an error parsing the feedback. Please try again.", { duration: 5000 });
        setLoading(false);
        return;
      }
    
      const response = await fetch(`/api/feedback/${interviewdata.mockid}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mockidRef: interviewdata.mockid,
          question: mockinterviewquestions[activequestionindex]?.question,
          correctanswer: mockinterviewquestions[activequestionindex]?.answer,
          useranswer: userAnswer,
          feedback: jsonResponse?.feedback,
          detailedFeedback: JSON.stringify({
            confidence: { score: confidence.score, level: confidence.level, metrics: confidence.metrics, tips: confidence.tips, speechCoaching: confidence.speechCoaching },
            video: videoData ? { score: videoData.score, level: videoData.level, checks: videoData.checks, tips: videoData.tips } : null,
            speechTips: jsonResponse?.speechTips || [],
          }),
          rating: String(jsonResponse?.rating || ''),
          userEmail: user?.primaryEmailAddress?.emailAddress,
          createdat: moment().format('YYYY-MM-DD HH:mm:ss')
        })
      });
    
      if (response.ok) {
        toast.success('Answer recorded successfully');
        setUserAnswer('');
        setResults([]);
        processedResultsRef.current = 0;
      } else {
        const errData = await response.json().catch(() => ({}));
        console.error('Failed to save feedback:', response.status, errData);
        toast.error('Failed to save your answer. Please try again.');
      }
    } catch (error) {
      console.error("Error in updateUserAnswerInDb:", error);
      toast.error("Something went wrong while saving your answer. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const [showQuestion, setShowQuestion] = useState(true);

  const handleWebcamError = (error) => {
    console.error('Webcam error:', error);
    setWebcamError('Could not access webcam. Please check permissions and try again.');
    toast.error('Could not access webcam. Please check permissions.');
  };

  const textToSpeech = (text) => {
    if ('speechSynthesis' in window) {
      const speech = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(speech);
    } else {
      toast.error('Text-to-speech not supported.');
    }
  };

  const currentQuestion = mockinterviewquestions?.[activequestionindex];

  return (
    <div className="relative w-full max-w-5xl mx-auto" style={{ height: 'min(85vh, 760px)' }}>
      {/* ── Camera Container with HUD ── */}
      <div className="relative w-full h-full overflow-hidden rounded-[28px] bg-[#1a4d4d]"
        style={{ boxShadow: '0 8px 32px rgba(45, 95, 95, 0.18)' }}>
        {/* Webcam feed */}
        {webcamError ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <div className="w-20 h-20 rounded-full bg-[#f5ebe0]/10 flex items-center justify-center mb-4">
              <Video className="w-10 h-10 text-[#f5ebe0]/40" />
            </div>
            <p className="text-sm text-[#f5ebe0]/60">{webcamError}</p>
          </div>
        ) : (
          <>
            <Image src="/webcam.png" width={200} height={200} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-5" alt="" />
            <Webcam
              ref={webcamRef}
              mirrored={true}
              screenshotFormat="image/jpeg"
              onUserMediaError={handleWebcamError}
              className="absolute inset-0 z-10 w-full h-full object-cover"
            />
          </>
        )}

        {/* ── TOP BAR ── */}
        <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-5 py-3">
          <div className="flex items-center gap-3">
            {isRecording && (
              <div className="flex items-center gap-1.5 bg-red-500 text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-sm">
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                REC
              </div>
            )}
            <span className="text-[#f5ebe0]/80 text-xs font-medium bg-[#1a4d4d]/60 backdrop-blur-sm px-2.5 py-0.5 rounded-full">
              Q{activequestionindex + 1}/{mockinterviewquestions?.length || '…'}
            </span>
          </div>

          {/* Progress dots */}
          <div className="flex items-center gap-1.5 bg-[#1a4d4d]/50 backdrop-blur-sm px-3 py-1.5 rounded-full">
            {mockinterviewquestions?.map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  i === activequestionindex
                    ? 'bg-[#f5ebe0] scale-125'
                    : 'bg-[#f5ebe0]/30'
                }`}
              />
            ))}
          </div>

          <div className="w-16 flex justify-end">
            {loading && (
              <div className="flex items-center gap-1.5 bg-[#1a4d4d]/60 backdrop-blur-sm px-2.5 py-1 rounded-full text-[#f5ebe0]/70 text-[11px]">
                <div className="w-3 h-3 border-2 border-[#f5ebe0]/20 border-t-[#f5ebe0] rounded-full animate-spin" />
                AI
              </div>
            )}
          </div>
        </div>

        {/* ── QUESTION OVERLAY ── */}
        {currentQuestion && (
          <div className={`absolute top-14 left-4 right-4 z-30 transition-all duration-300 ${showQuestion ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'}`}>
            <div className="bg-[#1a4d4d]/75 backdrop-blur-xl rounded-[20px] p-4 border border-[#3d7373]/30"
              style={{ boxShadow: '0 4px 20px rgba(45, 95, 95, 0.15)' }}>
              <div className="flex items-start justify-between gap-3">
                <p className="text-[#f5ebe0] text-sm md:text-base font-medium leading-relaxed flex-1">
                  {currentQuestion.question}
                </p>
                <button
                  onClick={() => textToSpeech(currentQuestion.question)}
                  className="w-8 h-8 bg-[#f5ebe0]/15 hover:bg-[#f5ebe0]/25 rounded-full flex items-center justify-center transition-all flex-shrink-0"
                  title="Listen to question"
                >
                  <Volume2 className="w-3.5 h-3.5 text-[#f5ebe0]/80" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── LIVE TRANSCRIPT ── */}
        {(interimResult || userAnswer) && (
          <div className="absolute bottom-28 left-4 right-4 z-30">
            <div className="bg-[#1a4d4d]/70 backdrop-blur-xl rounded-[12px] px-4 py-3 border border-[#3d7373]/20">
              <p className="text-[#f5ebe0] text-sm leading-relaxed text-center line-clamp-2">
                {interimResult || userAnswer.split(' ').slice(-20).join(' ')}
              </p>
            </div>
          </div>
        )}

        {/* ── BOTTOM CONTROL BAR (inside camera HUD) ── */}
        <div className="absolute bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-[#1a4d4d]/80 via-[#1a4d4d]/40 to-transparent px-5 pb-5 pt-10">
          <div className="flex items-center justify-between">
            {/* Left: Prev */}
            <div className="w-24">
              {!isFirst && (
                <button
                  onClick={onPrev}
                  className="flex items-center gap-1.5 text-[#f5ebe0]/70 hover:text-[#f5ebe0] text-sm font-medium transition-all hover:translate-x-[-2px]"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Prev
                </button>
              )}
            </div>

            {/* Center: Action buttons */}
            <div className="flex items-center gap-3">
              {/* Toggle question */}
              <button
                onClick={() => setShowQuestion(!showQuestion)}
                className="w-11 h-11 rounded-full bg-[#f5ebe0]/15 hover:bg-[#f5ebe0]/25 backdrop-blur-sm flex items-center justify-center transition-all text-[#f5ebe0]/80 hover:text-[#f5ebe0]"
                title={showQuestion ? 'Hide question' : 'Show question'}
              >
                {showQuestion ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>

              {/* MIC button */}
              <button
                disabled={loading}
                onClick={saveUserAnswer}
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
                  <div className="w-6 h-6 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                ) : isRecording ? (
                  <MicOff className="w-7 h-7" />
                ) : (
                  <Mic className="w-7 h-7" />
                )}
                {isRecording && !loading && (
                  <span className="absolute inset-0 rounded-full border-2 border-red-400 animate-ping opacity-30" />
                )}
              </button>

              {/* Camera indicator */}
              <button
                className="w-11 h-11 rounded-full bg-[#f5ebe0]/15 backdrop-blur-sm flex items-center justify-center text-[#f5ebe0]/60 cursor-default"
                title="Camera active"
              >
                <Video className="w-5 h-5" />
              </button>
            </div>

            {/* Right: Next/End */}
            <div className="w-24 flex justify-end">
              {!isLast ? (
                <button
                  onClick={onNext}
                  className="flex items-center gap-1.5 text-[#f5ebe0]/70 hover:text-[#f5ebe0] text-sm font-medium transition-all hover:translate-x-[2px]"
                >
                  Next
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <Link href={`/dashboard/interview/${interviewId}/feedback`}>
                  <button className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white text-sm font-medium px-3 py-1.5 rounded-full transition-all"
                    style={{ boxShadow: '0 2px 8px rgba(239,68,68,0.2)' }}>
                    <Flag className="w-3.5 h-3.5" />
                    End
                  </button>
                </Link>
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

export default RecordAnswerSection;
