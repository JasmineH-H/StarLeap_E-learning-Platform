import React from 'react';

interface QuizEndProps {
  score: number;
  onNewChapter: () => void;
}

export const QuizEnd: React.FC<QuizEndProps> = ({ score, onNewChapter }) => {
  return (
    <div className="quiz-end-container flex justify-center items-center mt-12">
      {/* Congratulations Card */}
      <div className="congratulations-card px-20 py-10 rounded-4xl bg-[#47546C] text-white flex flex-col gap-10 items-center justify-start">
        <div className="congratulations-title text-4xl">Congratulation!</div>

        <div className="score-container flex rlex-row justify-center items-center gap-4">
          <div className="score-text text-2xl mr-4">You've earned</div>
          <div className="score-number text-2xl">3 </div>
          <img src={'/assets/images/Quiz/crystal.png'} className="w-10 h-10" />
        </div>

        <button onClick={onNewChapter} className="bg-[#B17F9E] px-6 py-2 opacity-85 rounded-xl hover:opacity-100">
          New Chapter
        </button>
      </div>
    </div>
  );
};
