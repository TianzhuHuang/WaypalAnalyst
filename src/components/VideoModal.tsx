'use client';

import React from 'react';

interface VideoModalProps {
  videoId: string;
  onClose: () => void;
}

export default function VideoModal({ videoId, onClose }: VideoModalProps) {
  return (
    <div className="fixed inset-0 z-[500] bg-black/95 flex items-center justify-center p-4 md:p-10 animate-fade-in">
      <button onClick={onClose} className="absolute top-6 right-6 w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-all z-10">
        <i className="fa-solid fa-xmark text-xl"></i>
      </button>
      <div className="w-full max-w-5xl aspect-video rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/5">
        <iframe 
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1`} 
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
          allowFullScreen
        ></iframe>
      </div>
    </div>
  );
}
