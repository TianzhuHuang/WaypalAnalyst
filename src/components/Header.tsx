'use client';

export default function Header() {
  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-sm border-b border-green-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center h-20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full border-2 border-green-500 flex items-center justify-center bg-green-50">
              <span className="text-xl">🐸</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Waypal Hotel Expert</h1>
          </div>
        </div>
      </div>
    </header>
  );
}


