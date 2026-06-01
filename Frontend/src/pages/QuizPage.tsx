import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { makeAuthenticatedRequest } from '../utils/api';
import type { QuizQuestion } from '../types/quizQuestion.types';
import { QuizEnd } from '../components/QuizEnd';
import { Headers } from '../components/Header';
import { useAuth } from '../contexts/AuthContext';
import { useCourses } from '../contexts/CourseContext';
import { ProgressBar } from '../components/ProgressBar';

const QuizPage: React.FC = () => {
  const navigate = useNavigate();
  const { courseId, moduleId } = useParams();

  const [quiz, setQuiz] = useState<QuizQuestion | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selections, setSelections] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const { user, crystals, setCrystals } = useAuth();
  const { fetchCourses } = useCourses();
  const fetchQuiz = useCallback(async () => {
    if (!courseId || !moduleId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await makeAuthenticatedRequest(
        `/api/study/quiz/${encodeURIComponent(courseId)}/${encodeURIComponent(moduleId)}`
      );
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Quiz fetch failed: ${res.status} ${text}`);
      }
      const data = await res.json();
      const q: QuizQuestion = data?.data || data;
      setQuiz(q);
      setCurrentIndex(0);
      setSelections({});
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch quiz');
      console.error('Error fetching quiz data:', err);
    } finally {
      setLoading(false);
    }
  }, [courseId, moduleId]);

  useEffect(() => {
    fetchQuiz();
  }, [fetchQuiz]);

  const selectOption = (optionId: string) => {
    setSelections((s) => ({ ...s, [currentIndex]: optionId }));
  };

  const goToDashboardWithContext = () => {
    const params = new URLSearchParams();
    if (courseId) params.set('courseId', courseId);
    if (moduleId) params.set('moduleId', moduleId);
    navigate(`/dashboard?${params.toString()}`, { replace: true });
  };

  const handleNext = () => {
    if (!quiz) return;
    if (currentIndex < quiz.questions.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      handleSubmit();
    }
  };

  // const handlePrevious = () => {
  //   if (!quiz) return;
  //   if (currentIndex > 0) {
  //     setCurrentIndex((i) => i - 1);
  //   } else {
  //     handleSubmit();
  //   }
  // };

  const handleSubmit = async () => {
    if (!quiz) return;
    setSubmitting(true);
    try {
      const answers = quiz.questions.map((q, idx) => ({
        questionId: (q as any)._id || null,
        selectedOptionId: selections[idx] || null,
      }));

      let correctCount = 0;
      quiz.questions.forEach((q, idx) => {
        const sel = selections[idx];
        if (!sel) return;
        const option = (q as any).options.find((o: any) => o._id === sel || o._id === String(sel));
        if (option && option.isCorrect) correctCount++;
      });

      const payload = { answers, score: correctCount };

      const res = await makeAuthenticatedRequest(
        `/api/study/user/${user?._id}/quiz/${quiz._id}/attempt`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) {
        const text = await res.text();
        console.warn('Submission response:', res.status, text);
      }

      // refresh course data so module crystals update
      await fetchCourses();

      setFinalScore(correctCount);
      setCrystals((prev) => prev + 3);
      setQuizCompleted(true);
    } catch (err) {
      console.error('Submit failed', err);
      setError('Submit failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#191A31]">
        <div className="text-white text-2xl font-['Tiny5']">Loading quiz...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#191A31]">
        <div className="text-red-500 text-2xl font-['Tiny5']">{error}</div>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#191A31]">
        <div className="text-white text-2xl font-['Tiny5']">No quiz available for this module.</div>
      </div>
    );
  }

  const currentQuestion = quiz.questions[currentIndex];

  return (
    <div className="w-full h-full">
      {/* Navigation */}
      <Headers />

      {/* Main Content */}
      <div className="w-screen min-h-screen flex flex-col space-bg-scroll">
        {/* Correct progress value */}
        <div className="mt-6 mb-4">
          <ProgressBar progress={quizCompleted ? quiz.questions.length : currentIndex} />
        </div>
        {/* Main content area */}
        {quizCompleted ? (
          <QuizEnd score={finalScore} onNewChapter={goToDashboardWithContext} />
        ) : (
          <div className="flex flex-row justify-center items-center">
            <div className="w-[85%] h-[70%] max-w-[1500px] flex flex-row items-center bg-[#47546C] rounded-4xl mt-12 ">
              {/* Question area */}
              <div className=" p-10 basis-1/2 ml-20">
                <div className="text-[#BEC5D2] text-2xl font-semibold mb-2">
                  Question {currentIndex + 1}
                </div>
                <div className="text-[#BEC5D2] text-xl mb-3">{currentQuestion.text}</div>
                <img
                  src={`http://localhost:3000/api/study/quiz/${quiz._id}/questions/${(currentQuestion as any)._id}/image`}
                  alt="question image"
                  className="w-[60%] rounded-2xl"
                />
              </div>

              {/* Answer options panel */}
              <div className=" mr-20 p-12 basis-1/2 justify-start items-center flex flex-col gap-6">
                {/* Dynamic options */}
                {(currentQuestion as any).options.map((option: any) => {
                  const isSelected = selections[currentIndex] === option._id;
                  const hasSelected = !!isSelected;
                  const isCorrect = option.isCorrect;
                  return (
                    <div key={option._id} className="w-full flex flex-col items-center">
                      <button
                        key={option._id}
                        disabled={!!selections[currentIndex]}
                        onClick={() => selectOption(option._id)}
                        className={`w-[60%] rounded-xl text-2xl p-2 shadow-2xl hover:opacity-75 transition-all duration-200 cursor-pointer
                        ${
                          !selections[currentIndex]
                            ? 'bg-white text-[#45413C]' // BEFORE selection
                            : option.isCorrect
                              ? 'bg-[#78A888] text-white' // CORRECT
                              : isSelected && !option.isCorrect
                                ? 'bg-[#D96A6A] text-white' // WRONG
                                : 'bg-gray-300 text-gray-600' // OTHER buttons after selecting
                        }`}>
                        {option.text}
                      </button>
                      {hasSelected && isSelected && (
                        <div
                          className={`w-[60%] mb-2 text-left text-xl font-semibold ${
                            isCorrect ? 'text-[#78A888]' : 'text-[#D96A6A]'
                          }`}>
                          {isCorrect ? 'Correct!' : 'Almost! Take another look.'}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Next button */}
                <button
                  onClick={handleNext}
                  disabled={!selections[currentIndex] || submitting}
                  className="w-[60%] rounded-xl text-2xl p-2 shadow-2xl shadow-black bg-[#B17F9E] mt-4 disabled:opacity-45 transition-opacity items-end hover:opacity-75 cursor-pointer">
                  {currentIndex < quiz.questions.length - 1
                    ? 'Next'
                    : submitting
                      ? 'Submitting...'
                      : 'Submit'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuizPage;
