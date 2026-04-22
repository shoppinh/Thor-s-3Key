import { useEffect, useRef } from 'react';
import { useTheme } from '~/contexts/ThemeContext';

export default function SummerScene() {
  const { theme } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (theme !== 'summer') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    // Elements
    const birds: { x: number; y: number; scale: number; speed: number; flapOffset: number }[] = [];
    for (let i = 0; i < 7; i++) {
      birds.push({
        x: Math.random() * width,
        y: Math.random() * height * 0.3 + 50,
        scale: Math.random() * 0.4 + 0.3,
        speed: Math.random() * 1.5 + 0.5,
        flapOffset: Math.random() * Math.PI * 2
      });
    }

    const clouds: { x: number; y: number; scale: number; speed: number }[] = [];
    for (let i = 0; i < 5; i++) {
      clouds.push({
        x: Math.random() * width,
        y: Math.random() * height * 0.4,
        scale: Math.random() * 0.6 + 0.4,
        speed: Math.random() * 0.3 + 0.1
      });
    }

    let time = 0;
    let animationFrameId: number;

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      const horizonY = height * 0.65;

      // Draw Sun
      ctx.fillStyle = 'rgba(255, 230, 0, 0.9)';
      ctx.beginPath();
      ctx.arc(width * 0.75, horizonY - 50, 70, 0, Math.PI * 2);
      ctx.fill();
      // Sun glow
      ctx.fillStyle = 'rgba(255, 230, 0, 0.2)';
      ctx.beginPath();
      ctx.arc(width * 0.75, horizonY - 50, 120 + Math.sin(time * 0.03) * 10, 0, Math.PI * 2);
      ctx.fill();

      // Draw Ocean
      const oceanGradient = ctx.createLinearGradient(0, horizonY, 0, height);
      oceanGradient.addColorStop(0, 'rgba(0, 130, 255, 0.6)');
      oceanGradient.addColorStop(1, 'rgba(0, 200, 255, 0.6)');
      ctx.fillStyle = oceanGradient;
      ctx.fillRect(0, horizonY, width, height - horizonY);

      // Draw Waves
      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        let waveY = horizonY + i * 35 + Math.sin(time * 0.04 + i) * 15;
        ctx.moveTo(0, waveY);
        for (let x = 0; x <= width; x += 20) {
          ctx.lineTo(x, waveY + Math.sin(x * 0.02 + time * 0.04 + i) * 10);
        }
        ctx.lineTo(width, height);
        ctx.lineTo(0, height);
        ctx.fill();
      }

      // Draw Beach
      ctx.fillStyle = '#ffdf80'; // Sand color
      ctx.beginPath();
      ctx.moveTo(0, height);
      ctx.lineTo(0, height * 0.8);
      ctx.quadraticCurveTo(width * 0.25, height * 0.75, width * 0.45, height);
      ctx.lineTo(0, height);
      ctx.fill();

      // Draw Palm Tree Silhouette
      ctx.fillStyle = '#2c1e16'; // Trunk
      ctx.beginPath();
      ctx.moveTo(width * 0.08, height);
      ctx.quadraticCurveTo(width * 0.15, height * 0.7, width * 0.1, height * 0.4);
      ctx.lineTo(width * 0.12, height * 0.4);
      ctx.quadraticCurveTo(width * 0.18, height * 0.7, width * 0.12, height);
      ctx.fill();

      // Leaves
      ctx.fillStyle = '#1e3816';
      const drawLeaf = (cx: number, cy: number, rot: number) => {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(rot);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(40, -40, 120, 0);
        ctx.quadraticCurveTo(40, 20, 0, 0);
        ctx.fill();
        ctx.restore();
      };
      
      const treeTopX = width * 0.11;
      const treeTopY = height * 0.4;
      
      drawLeaf(treeTopX, treeTopY, Math.PI * -0.1 + Math.sin(time * 0.02) * 0.05);
      drawLeaf(treeTopX, treeTopY, Math.PI * -0.4 + Math.sin(time * 0.02 + 1) * 0.05);
      drawLeaf(treeTopX, treeTopY, Math.PI * -0.7 + Math.sin(time * 0.02 + 2) * 0.05);
      drawLeaf(treeTopX, treeTopY, Math.PI * 0.2 + Math.sin(time * 0.02 + 3) * 0.05);
      drawLeaf(treeTopX, treeTopY, Math.PI * 0.5 + Math.sin(time * 0.02 + 4) * 0.05);

      // Draw Clouds
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      clouds.forEach(c => {
        ctx.beginPath();
        ctx.arc(c.x, c.y, 30 * c.scale, 0, Math.PI * 2);
        ctx.arc(c.x + 25 * c.scale, c.y - 10 * c.scale, 35 * c.scale, 0, Math.PI * 2);
        ctx.arc(c.x + 50 * c.scale, c.y, 30 * c.scale, 0, Math.PI * 2);
        ctx.fill();
        c.x += c.speed;
        if (c.x > width + 100) {
          c.x = -100;
          c.y = Math.random() * height * 0.4;
        }
      });

      // Draw Birds
      ctx.strokeStyle = '#222';
      ctx.lineWidth = 2;
      birds.forEach(b => {
        ctx.beginPath();
        const flap = Math.sin(time * 0.2 + b.flapOffset) * 10 * b.scale;
        ctx.moveTo(b.x, b.y);
        ctx.quadraticCurveTo(b.x + 10 * b.scale, b.y - 10 * b.scale + flap, b.x + 20 * b.scale, b.y);
        ctx.quadraticCurveTo(b.x + 30 * b.scale, b.y - 10 * b.scale + flap, b.x + 40 * b.scale, b.y);
        ctx.stroke();
        b.x += b.speed;
        if (b.x > width + 50) {
          b.x = -50;
          b.y = Math.random() * height * 0.3 + 50;
        }
      });

      time++;
      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, [theme]);

  if (theme !== 'summer') return null;

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0
      }}
    />
  );
}
