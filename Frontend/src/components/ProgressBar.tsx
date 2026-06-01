import React from 'react';
import { Rocket } from './Rocket';

interface ProgressBarProps {
  progress: number; // 0-3
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ progress }) => {
  const segments = 4;

  return (
    <div className="w-full flex flex-col items-center">
      
      {/* ---------- CRYSTALS + ROCKET ROW (normal flow) ---------- */}
      <div className="w-[85%] max-w-[1500px] flex justify-between px-4 relative mt-6">

        {Array.from({ length: segments }).map((_, i) => (
          <div key={i} className="w-1/4 flex justify-center items-center relative">

            {/* Crystal */}
            {i > 0 && (
              <img
                src={
                  progress >= i
                    ? '/assets/images/Quiz/crystal.png'
                    : '/assets/images/Quiz/crystal-gray.png'
                }
                className={`absolute z-0  mr-20 ${
                  progress >= i ? 'w-16 h-16 -top-2' : 'w-10 h-10 top-2'
                }`}
              />
            )}

            {/* Rocket */}
            {i === progress && (
              <div
                className="absolute -top-2 z-10 rocket-float transition-all duration-300"
                style={{ marginLeft: '50%' }} // shift slightly right
              >
                <Rocket />
              </div>
            )}

          </div>
        ))}

      </div>

      {/* ---------- PROGRESS BAR (normal flow) ---------- */}
      <div className="w-[85%] max-w-[1500px] h-[30px] mt-4 rounded-full flex overflow-hidden">
        {Array.from({ length: segments }).map((_, i) => {
          const filled = i <= progress;
          return (
            <div
              key={i}
              className={`flex-1 transition-colors duration-300 ${
                filled
                  ? 'bg-[#FEDEF2]'
                  : 'bg-[rgba(254,222,242,0.30)]'
              }`}
            />
          );
        })}
      </div>
    </div>
  );
};
