'use client';

import React from 'react';

interface RoomTourVideo {
  id: string;
  title: string;
  author: string;
  likes: string;
  coverUrl: string;
  videoId: string;
}

interface VideoTourListProps {
  videos: RoomTourVideo[];
  onPlay: (videoId: string) => void;
}

export default function VideoTourList({ videos, onPlay }: VideoTourListProps) {
  if (!videos || videos.length === 0) return null;

  return (
    <div className="mt-4 flex gap-3 overflow-x-auto no-scrollbar pb-2">
      {videos.map((video) => (
        <div key={video.id} onClick={() => onPlay(video.videoId)} className="shrink-0 w-64 bg-white/5 border border-white/10 rounded-3xl overflow-hidden cursor-pointer hover:bg-white/10 transition-all group">
          <div className="aspect-video relative overflow-hidden">
            <img src={video.coverUrl} className="w-full h-full object-cover transition-transform group-hover:scale-105" alt={video.title} />
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/10 transition-all">
               <div className="w-10 h-10 rounded-full bg-[#12d65e] flex items-center justify-center text-black shadow-lg shadow-[#12d65e]/30 scale-90 group-hover:scale-100 transition-transform">
                  <i className="fa-solid fa-play ml-1"></i>
               </div>
            </div>
          </div>
          <div className="p-4 space-y-1">
            <h4 className="text-[12px] font-black text-white/90 line-clamp-1 leading-tight tracking-tight uppercase">{video.title}</h4>
            <div className="flex items-center justify-between">
               <span className="text-[9px] font-bold text-white/30 tracking-widest uppercase">{video.author}</span>
               <span className="text-[9px] font-black text-[#12d65e]">{video.likes} likes</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
