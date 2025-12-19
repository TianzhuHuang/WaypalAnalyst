/**
 * StepLoader Component
 * Shows AI thinking progress with dynamic text cycling
 */

'use client';

import { useState, useEffect } from 'react';

interface StepLoaderProps {
  locale?: string;
}

export default function StepLoader({ locale = 'en' }: StepLoaderProps) {
  const isZh = locale === 'zh';
  const [currentStep, setCurrentStep] = useState(0);

  const steps = isZh
    ? [
        '正在寻找最佳价格...',
        '分析取消政策...',
        '对比会员权益...',
        '整理比价结果...',
      ]
    : [
        'Looking for best rates...',
        'Analyzing cancellation policies...',
        'Comparing with member benefits...',
        'Compiling comparison results...',
      ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % steps.length);
    }, 2000); // Change step every 2 seconds

    return () => clearInterval(interval);
  }, [steps.length]);

  return (
    <div className="flex justify-start">
      <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="relative">
            <span 
              className="text-2xl block animate-bounce"
              style={{
                animation: 'frogJump 1s ease-in-out infinite',
              }}
            >
              🐸
            </span>
            <style jsx>{`
              @keyframes frogJump {
                0%, 100% {
                  transform: translateY(0) scale(1);
                }
                50% {
                  transform: translateY(-8px) scale(1.1);
                }
              }
            `}</style>
          </div>
          <div className="flex flex-col">
            <span className="text-sm text-gray-700 font-medium">
              {steps[currentStep]}
            </span>
            <div className="flex gap-1 mt-1">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`h-1 w-1 rounded-full transition-colors ${
                    index === currentStep
                      ? 'bg-green-500'
                      : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


