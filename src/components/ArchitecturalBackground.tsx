import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  size: number;
  vx: number;
  vy: number;
  alpha: number;
  baseAlpha: number;
  color: string;
  pulseSpeed: number;
  pulsePhase: number;
}

export const ArchitecturalBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const parallaxDeepRef = useRef<HTMLDivElement | null>(null);
  const parallaxGridRef = useRef<HTMLDivElement | null>(null);
  const mouseRef = useRef<{ x: number; y: number; targetX: number; targetY: number }>({
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0,
  });
  const scrollRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // High DPI support
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const colors = [
      'rgba(56, 189, 248,',  // cyan-400
      'rgba(129, 140, 248,', // indigo-400
      'rgba(167, 139, 250,', // violet-400
      'rgba(52, 211, 153,',  // emerald-400
      'rgba(248, 250, 252,', // white
    ];

    // Generate architectural particles / glowing nodes
    const particleCount = Math.min(Math.floor((width * height) / 22000), 55);
    const particles: Particle[] = [];

    for (let i = 0; i < particleCount; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const baseAlpha = 0.15 + Math.random() * 0.45;
      particles.push({
        x,
        y,
        baseX: x,
        baseY: y,
        size: 1 + Math.random() * 2.2,
        vx: (Math.random() - 0.5) * 0.25,
        vy: -0.15 - Math.random() * 0.2, // Slow upward drift
        alpha: baseAlpha,
        baseAlpha,
        color: colors[Math.floor(Math.random() * colors.length)],
        pulseSpeed: 0.015 + Math.random() * 0.02,
        pulsePhase: Math.random() * Math.PI * 2,
      });
    }

    // Scroll & Mouse Listeners
    const handleScroll = () => {
      scrollRef.current = window.scrollY;
      
      // Update CSS parallax layers
      if (parallaxDeepRef.current) {
        parallaxDeepRef.current.style.transform = `translate3d(0, ${-scrollRef.current * 0.05}px, 0)`;
      }
      if (parallaxGridRef.current) {
        parallaxGridRef.current.style.transform = `translate3d(0, ${-scrollRef.current * 0.12}px, 0)`;
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.targetX = e.clientX;
      mouseRef.current.targetY = e.clientY;
    };

    const handleResize = () => {
      if (!canvas) return;
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('resize', handleResize);

    // Initial scroll sync
    handleScroll();

    let lastTime = performance.now();

    const render = (time: number) => {
      const delta = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      // Smooth mouse interpolation
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.05;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.05;

      ctx.clearRect(0, 0, width, height);

      const scrollOffset = scrollRef.current * 0.18;

      // Render floating particles with soft glow and mouse reaction
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Animate position
        p.y += p.vy * (delta * 60);
        p.x += p.vx * (delta * 60) + Math.sin(time * 0.001 + p.pulsePhase) * 0.08;

        // Wrap around screen
        if (p.y < -20) p.y = height + 20;
        if (p.x < -20) p.x = width + 20;
        if (p.x > width + 20) p.x = -20;

        // Calculate rendered position with scroll parallax
        const renderY = ((p.y - scrollOffset) % (height + 40) + (height + 40)) % (height + 40) - 20;

        // Subtle mouse interaction (gentle displacement)
        const dx = p.x - mouseRef.current.x;
        const dy = renderY - mouseRef.current.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        let offsetX = 0;
        let offsetY = 0;
        if (dist < 120 && dist > 0) {
          const force = (120 - dist) / 120;
          offsetX = (dx / dist) * force * 15;
          offsetY = (dy / dist) * force * 15;
        }

        // Pulse alpha
        p.pulsePhase += p.pulseSpeed;
        const currentAlpha = p.baseAlpha + Math.sin(p.pulsePhase) * 0.15;

        // Particle Glow
        const drawX = p.x + offsetX;
        const drawY = renderY + offsetY;

        ctx.save();
        ctx.beginPath();
        const gradient = ctx.createRadialGradient(drawX, drawY, 0, drawX, drawY, p.size * 3);
        gradient.addColorStop(0, `${p.color} ${Math.max(0.05, currentAlpha)})`);
        gradient.addColorStop(0.5, `${p.color} ${Math.max(0.01, currentAlpha * 0.35)})`);
        gradient.addColorStop(1, `${p.color} 0)`);
        ctx.fillStyle = gradient;
        ctx.arc(drawX, drawY, p.size * 3, 0, Math.PI * 2);
        ctx.fill();

        // Core bright point
        ctx.beginPath();
        ctx.arc(drawX, drawY, p.size * 0.7, 0, Math.PI * 2);
        ctx.fillStyle = `${p.color} ${Math.min(1, currentAlpha + 0.2)})`;
        ctx.fill();
        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none overflow-hidden select-none z-0"
    >
      {/* 1. Deep Midnight & Obsidian Gradient Foundation */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#020617] via-[#040816] to-[#020617]" />

      {/* 2. Slow Drifting Volumetric Ambient Orbs (Parallax Layer 1) */}
      <div ref={parallaxDeepRef} className="absolute inset-0 transition-transform duration-75 ease-out will-change-transform">
        {/* Top-Left Violet/Indigo Ambient Orb */}
        <div className="absolute -top-[15%] -left-[10%] w-[700px] h-[700px] rounded-full bg-gradient-to-tr from-indigo-700/15 to-violet-600/10 blur-[130px] animate-float-slow pointer-events-none" />

        {/* Top-Right Cyan/Blue Ambient Orb */}
        <div className="absolute -top-[10%] right-[5%] w-[600px] h-[600px] rounded-full bg-gradient-to-br from-cyan-600/12 to-sky-500/10 blur-[140px] animate-float-reverse pointer-events-none" />

        {/* Center-Right Emerald Accent Orb */}
        <div className="absolute top-[45%] -right-[10%] w-[550px] h-[550px] rounded-full bg-gradient-to-bl from-emerald-500/8 to-teal-600/6 blur-[150px] animate-float-slow pointer-events-none" />

        {/* Bottom-Left Sapphire / Indigo Orb */}
        <div className="absolute -bottom-[10%] left-[10%] w-[650px] h-[650px] rounded-full bg-gradient-to-t from-blue-700/12 to-indigo-600/8 blur-[130px] animate-float-reverse pointer-events-none" />
      </div>

      {/* 3. Architectural Wireframe & Perspective Elevation Lines (Parallax Layer 2) */}
      <div ref={parallaxGridRef} className="absolute inset-0 transition-transform duration-75 ease-out will-change-transform">
        
        {/* Subtle Architectural Grid Pattern */}
        <div 
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(56, 189, 248, 0.4) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(56, 189, 248, 0.4) 1px, transparent 1px)
            `,
            backgroundSize: '80px 80px',
            maskImage: 'radial-gradient(ellipse 90% 80% at 50% 30%, black 40%, transparent 85%)',
            WebkitMaskImage: 'radial-gradient(ellipse 90% 80% at 50% 30%, black 40%, transparent 85%)'
          }}
        />

        {/* Abstract Architectural Building Elevation Silhouettes (Subtle SVG Vector Art) */}
        <svg
          className="absolute w-full h-[1200px] top-0 left-0 opacity-[0.07] stroke-cyan-400"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          strokeWidth="0.8"
        >
          {/* Subtle Skyline Elevation Wireframe Tower Left */}
          <g transform="translate(40, 80)">
            <rect x="0" y="80" width="120" height="420" strokeDasharray="3 3" />
            <line x1="0" y1="140" x2="120" y2="140" />
            <line x1="0" y1="200" x2="120" y2="200" />
            <line x1="0" y1="260" x2="120" y2="260" />
            <line x1="0" y1="320" x2="120" y2="320" />
            <line x1="0" y1="380" x2="120" y2="380" />
            {/* Balcony cantilevers */}
            <line x1="120" y1="140" x2="145" y2="140" />
            <line x1="120" y1="200" x2="145" y2="200" />
            <line x1="120" y1="260" x2="145" y2="260" />
            <line x1="120" y1="320" x2="145" y2="320" />
          </g>

          {/* Modern Geometric Architectural Elevation Right */}
          <g transform="translate(1080, 40)">
            <polygon points="40,40 180,40 220,100 220,520 40,520" strokeDasharray="4 4" />
            <line x1="40" y1="120" x2="220" y2="120" />
            <line x1="40" y1="180" x2="220" y2="180" />
            <line x1="40" y1="240" x2="220" y2="240" />
            <line x1="40" y1="300" x2="220" y2="300" />
            <line x1="40" y1="360" x2="220" y2="360" />
            <line x1="40" y1="420" x2="220" y2="420" />
            <circle cx="130" cy="80" r="12" strokeDasharray="2 2" />
          </g>

          {/* Perspective Floor Grid Horizon */}
          <g transform="translate(0, 600)" opacity="0.6">
            <line x1="0" y1="0" x2="1440" y2="0" stroke="rgba(129, 140, 248, 0.3)" strokeWidth="1" />
            <line x1="720" y1="0" x2="100" y2="500" stroke="rgba(129, 140, 248, 0.15)" />
            <line x1="720" y1="0" x2="350" y2="500" stroke="rgba(129, 140, 248, 0.15)" />
            <line x1="720" y1="0" x2="600" y2="500" stroke="rgba(129, 140, 248, 0.15)" />
            <line x1="720" y1="0" x2="840" y2="500" stroke="rgba(129, 140, 248, 0.15)" />
            <line x1="720" y1="0" x2="1090" y2="500" stroke="rgba(129, 140, 248, 0.15)" />
            <line x1="720" y1="0" x2="1340" y2="500" stroke="rgba(129, 140, 248, 0.15)" />
          </g>

          {/* Architectural Axis Crosshairs */}
          <g opacity="0.4" stroke="rgba(56, 189, 248, 0.6)">
            <path d="M 220 180 L 230 180 M 225 175 L 225 185" />
            <path d="M 720 120 L 730 120 M 725 115 L 725 125" />
            <path d="M 980 260 L 990 260 M 985 255 L 985 265" />
            <path d="M 450 480 L 460 480 M 455 475 L 455 485" />
          </g>
        </svg>

        {/* Soft Volumetric Light Beam Diagonal */}
        <div 
          className="absolute -top-[20%] right-[15%] w-[350px] h-[1000px] opacity-[0.04] bg-gradient-to-b from-indigo-300 via-cyan-400 to-transparent rotate-[35deg] blur-2xl pointer-events-none"
        />
        <div 
          className="absolute -top-[10%] left-[10%] w-[300px] h-[800px] opacity-[0.03] bg-gradient-to-b from-violet-300 via-indigo-500 to-transparent rotate-[-28deg] blur-2xl pointer-events-none"
        />
      </div>

      {/* 4. Canvas Floating Luminescent Particle Field */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full block"
      />

      {/* 5. Subtle Vignette Edge Darkening for Reading Focus */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 50% 50%, transparent 60%, rgba(2, 6, 23, 0.75) 100%)'
        }}
      />
    </div>
  );
};
