/**
 * WayPal Brand Frog Logo
 * Refined SVG for better centering and brand accuracy.
 */
export default function FrogLogoIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <div className={`${className} relative flex items-center justify-center shrink-0`}>
      <svg viewBox="0 0 1024 1024" className="w-full h-full drop-shadow-[0_0_15px_rgba(18,214,94,0.15)]" xmlns="http://www.w3.org/2000/svg">
        <path d="M798 332c-35-51-92-82-155-82-27 0-53 6-76 17-15-20-39-33-66-33s-51 13-66 33c-23-11-49-17-76-17-63 0-120 31-155 82-25 36-39 80-39 127 0 126 102 228 228 228h216c126 0 228-102 228-228 0-47-14-91-39-127zM342 506c-38 0-68-30-68-68s30-68 68-68 68 30 68 68-30 68-68 68zM682 506c-38 0-68-30-68-68s30-68 68-68 68 30 68 68-30 68-68 68zM428 650c54 42 114 42 168 0 8 6 18 10 28 10 24 0 44-20 44-44s-20-44-44-44c-12 0-22 5-30 12-40-30-84-30-124 0-8-7-18-12-30-12-24 0-44 20-44 44s20 44 44 44c10 0 20-4 28-10z" fill="#12d65e"/>
      </svg>
    </div>
  );
}
