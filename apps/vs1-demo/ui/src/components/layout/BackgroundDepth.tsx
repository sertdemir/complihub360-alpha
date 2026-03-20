export function BackgroundDepth() {
  return (
    <div className="fixed inset-0 z-[-1] pointer-events-none overflow-hidden bg-background">
      {/* 1. Subtle Grid Pattern */}
      <div 
        className="absolute inset-0 opacity-[0.02]" 
        style={{
          backgroundImage: 'linear-gradient(to right, #004D40 1px, transparent 1px), linear-gradient(to bottom, #004D40 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }}
      />
      
      {/* 2. Glow Orbs */}
      {/* Top Right - Forest Green */}
      <div className="absolute -top-[10%] -right-[15%] w-[800px] h-[800px] rounded-full bg-primary-400/10 blur-[140px]" />
      
      {/* Middle Left - Gold / Accent */}
      <div className="absolute top-[35%] -left-[15%] w-[600px] h-[600px] rounded-full bg-accent-400/10 blur-[160px]" />
      
      {/* Bottom Center - Faint Green */}
      <div className="absolute top-[80%] left-[20%] w-[1000px] h-[600px] rounded-full bg-primary-200/20 blur-[180px]" />
    </div>
  );
}
