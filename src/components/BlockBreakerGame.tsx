// File: src/components/BlockBreakerGame.tsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, RotateCcw } from 'lucide-react';

// Increased base size (wider & taller), will still scale on mobile
const BASE_WIDTH = 500;
const BASE_HEIGHT = 800;
const ASPECT_RATIO = BASE_HEIGHT / BASE_WIDTH;

const TABLE_TOP = 50;
const TABLE_BOTTOM = BASE_HEIGHT - TABLE_TOP;
const PADDLE_WIDTH = 80;
const PADDLE_HEIGHT = 10;
const BALL_RADIUS = 5;
const BASE_BALL_SPEED = 3;
const BLOCK_WIDTH = 30;
const BLOCK_HEIGHT = 15;
const BLOCK_SCORE = 10;

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface Block {
  x: number;
  y: number;
  active: boolean;
  vx?: number;
}

const BlockBreakerGame: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'playing' | 'paused' | 'gameOver' | 'waiting' | 'win'>('waiting');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => parseInt(localStorage.getItem('blockbreaker-highScore') || '0'));
  const [level, setLevel] = useState(1);
  const [rating, setRating] = useState('');
  const [canvasSize, setCanvasSize] = useState({ width: BASE_WIDTH, height: BASE_HEIGHT });

  const gameStateRef = useRef(gameState);
  const playerPaddleXRef = useRef(canvasSize.width / 2 - PADDLE_WIDTH / 2);
  const ballRef = useRef<Ball>({ x: canvasSize.width / 2, y: canvasSize.height / 2, vx: BASE_BALL_SPEED, vy: -BASE_BALL_SPEED });
  const blocksRef = useRef<Block[]>([]);
  const scoreRef = useRef(0);
  const levelRef = useRef(level);
  const scaleRef = useRef(1);

  // Init blocks
  const initBlocks = useCallback(() => {
    const blocks: Block[] = [];
    const blockSpacingX = (BASE_WIDTH - 8 * BLOCK_WIDTH) / 9;
    const blockSpacingY = 10;
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 8; col++) {
        blocks.push({
          x: blockSpacingX + col * (BLOCK_WIDTH + blockSpacingX),
          y: TABLE_TOP + blockSpacingY + row * (BLOCK_HEIGHT + blockSpacingY),
          active: true,
        });
      }
    }
    blocksRef.current = blocks;
  }, []);

  // Responsive canvas size
  const updateCanvasSize = useCallback(() => {
    const maxWidth = Math.min(window.innerWidth * 0.95, BASE_WIDTH);
    const height = maxWidth * ASPECT_RATIO;
    setCanvasSize({ width: maxWidth, height });
    scaleRef.current = maxWidth / BASE_WIDTH;
  }, []);

  useEffect(() => {
    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, [updateCanvasSize]);

  const getRating = (score: number) => {
    if (score > 1000) return 'A';
    if (score > 500) return 'B';
    if (score > 200) return 'C';
    if (score > 100) return 'D';
    return 'F';
  };

  // --- Drawing logic ---
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const scale = scaleRef.current;
    const SCALED_TABLE_TOP = TABLE_TOP * scale;
    const SCALED_TABLE_BOTTOM = TABLE_BOTTOM * scale;

    canvas.width = canvasSize.width * window.devicePixelRatio;
    canvas.height = canvasSize.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Background
    const gradient = ctx.createLinearGradient(0, 0, 0, canvasSize.height);
    gradient.addColorStop(0, 'hsl(220, 13%, 8%)');
    gradient.addColorStop(1, 'hsl(220, 13%, 12%)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);

    // Boundaries
    ctx.strokeStyle = 'hsl(271, 81%, 56%)';
    ctx.lineWidth = 5 * scale;
    ctx.beginPath();
    ctx.moveTo(0, SCALED_TABLE_TOP);
    ctx.lineTo(canvasSize.width, SCALED_TABLE_TOP);
    ctx.moveTo(0, SCALED_TABLE_BOTTOM);
    ctx.lineTo(canvasSize.width, SCALED_TABLE_BOTTOM);
    ctx.stroke();

    // Paddle
    ctx.fillStyle = 'hsl(193, 76%, 56%)';
    ctx.fillRect(playerPaddleXRef.current, SCALED_TABLE_BOTTOM - PADDLE_HEIGHT * scale, PADDLE_WIDTH * scale, PADDLE_HEIGHT * scale);

    // Blocks
    ctx.fillStyle = 'hsl(271, 81%, 56%)';
    blocksRef.current.forEach(block => {
      if (block.active) ctx.fillRect(block.x * scale, block.y * scale, BLOCK_WIDTH * scale, BLOCK_HEIGHT * scale);
    });

    // Ball
    ctx.fillStyle = 'hsl(322, 81%, 56%)';
    ctx.beginPath();
    ctx.arc(ballRef.current.x, ballRef.current.y, BALL_RADIUS * scale, 0, Math.PI * 2);
    ctx.fill();

    // HUD
    ctx.fillStyle = 'hsl(193, 76%, 56%)';
    ctx.font = `bold ${20 * scale}px monospace`;
    ctx.textAlign = 'left';
    ctx.fillText(`Level: ${levelRef.current}`, 10 * scale, SCALED_TABLE_TOP / 2);

    ctx.fillStyle = 'hsl(322, 81%, 56%)';
    ctx.font = `bold ${24 * scale}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(scoreRef.current.toString(), canvasSize.width / 2, SCALED_TABLE_TOP / 2);

    // Overlay for Game Over / Win
    if (['gameOver', 'win'].includes(gameStateRef.current)) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);

      ctx.fillStyle = 'hsl(271, 81%, 56%)';
      ctx.font = `${32 * scale}px monospace`;
      ctx.textAlign = 'center';
      ctx.fillText(gameStateRef.current === 'win' ? 'YOU WIN!' : 'GAME OVER', canvasSize.width / 2, canvasSize.height / 2 - 40 * scale);

      ctx.fillStyle = 'hsl(193, 76%, 56%)';
      ctx.font = `${16 * scale}px monospace`;
      ctx.fillText(`Score: ${scoreRef.current}`, canvasSize.width / 2, canvasSize.height / 2);
      ctx.fillText(`Rating: ${rating}`, canvasSize.width / 2, canvasSize.height / 2 + 30 * scale);
    }
  }, [canvasSize, rating]);

  // --- Update game logic ---
  const update = useCallback(() => {
    if (gameStateRef.current !== 'playing') return;
    const scale = scaleRef.current;
    const SCALED_TABLE_TOP = TABLE_TOP * scale;
    const SCALED_TABLE_BOTTOM = TABLE_BOTTOM * scale;

    ballRef.current.x += ballRef.current.vx * scale;
    ballRef.current.y += ballRef.current.vy * scale;

    if (ballRef.current.x - BALL_RADIUS * scale < 0 || ballRef.current.x + BALL_RADIUS * scale > canvasSize.width) {
      ballRef.current.vx = -ballRef.current.vx;
    }
    if (ballRef.current.y - BALL_RADIUS * scale < SCALED_TABLE_TOP) {
      ballRef.current.vy = -ballRef.current.vy;
    }

    // Paddle bounce
    if (
      ballRef.current.y + BALL_RADIUS * scale > SCALED_TABLE_BOTTOM - PADDLE_HEIGHT * scale &&
      ballRef.current.x > playerPaddleXRef.current &&
      ballRef.current.x < playerPaddleXRef.current + PADDLE_WIDTH * scale
    ) {
      ballRef.current.vy = -ballRef.current.vy;
      scoreRef.current += 1;
      setScore(scoreRef.current);
    }

    // Block collisions
    blocksRef.current.forEach(block => {
      if (block.active) {
        const blockLeft = block.x * scale;
        const blockRight = (block.x + BLOCK_WIDTH) * scale;
        const blockTop = block.y * scale;
        const blockBottom = (block.y + BLOCK_HEIGHT) * scale;
        if (
          ballRef.current.x + BALL_RADIUS * scale > blockLeft &&
          ballRef.current.x - BALL_RADIUS * scale < blockRight &&
          ballRef.current.y + BALL_RADIUS * scale > blockTop &&
          ballRef.current.y - BALL_RADIUS * scale < blockBottom
        ) {
          block.active = false;
          ballRef.current.vy = -ballRef.current.vy;
          scoreRef.current += BLOCK_SCORE;
          setScore(scoreRef.current);
        }
      }
    });

    // Win / Lose
    if (blocksRef.current.every(block => !block.active)) {
      setGameState('win');
      gameStateRef.current = 'win';
      setRating(getRating(scoreRef.current));
      if (scoreRef.current > highScore) {
        setHighScore(scoreRef.current);
        localStorage.setItem('blockbreaker-highScore', scoreRef.current.toString());
      }
    }
    if (ballRef.current.y + BALL_RADIUS * scale > SCALED_TABLE_BOTTOM) {
      setGameState('gameOver');
      gameStateRef.current = 'gameOver';
      setRating(getRating(scoreRef.current));
      if (scoreRef.current > highScore) {
        setHighScore(scoreRef.current);
        localStorage.setItem('blockbreaker-highScore', scoreRef.current.toString());
      }
    }
  }, [canvasSize, highScore]);

  // Game loop
  const gameLoop = useCallback(() => {
    update();
    draw();
  }, [update, draw]);

  useEffect(() => {
    const interval = setInterval(gameLoop, 16);
    return () => clearInterval(interval);
  }, [gameLoop]);

  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);

  // Controls (mouse/touch/keyboard) stay unchanged...
  const handleMouseMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (gameStateRef.current !== 'playing') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scale = canvasSize.width / canvas.offsetWidth;
    const x = (('touches' in e ? e.touches[0].clientX : e.clientX) - rect.left) * scale;
    playerPaddleXRef.current = x - (PADDLE_WIDTH / 2 * scaleRef.current);
    playerPaddleXRef.current = Math.max(0, Math.min(playerPaddleXRef.current, canvasSize.width - PADDLE_WIDTH * scaleRef.current));
  }, [canvasSize]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (gameStateRef.current !== 'playing') return;
    const moveAmount = 15 * scaleRef.current;
    if (['ArrowLeft', 'a', 'A'].includes(e.key)) {
      playerPaddleXRef.current = Math.max(0, playerPaddleXRef.current - moveAmount);
    } else if (['ArrowRight', 'd', 'D'].includes(e.key)) {
      playerPaddleXRef.current = Math.min(canvasSize.width - PADDLE_WIDTH * scaleRef.current, playerPaddleXRef.current + moveAmount);
    }
  }, [canvasSize]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.addEventListener('mousemove', handleMouseMove as any);
      canvas.addEventListener('touchmove', handleMouseMove as any);
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      if (canvas) {
        canvas.removeEventListener('mousemove', handleMouseMove as any);
        canvas.removeEventListener('touchmove', handleMouseMove as any);
      }
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleMouseMove, handleKeyDown]);

  // Game actions
  const startGame = () => {
    playerPaddleXRef.current = canvasSize.width / 2 - PADDLE_WIDTH / 2 * scaleRef.current;
    ballRef.current = { x: canvasSize.width / 2, y: canvasSize.height / 2, vx: BASE_BALL_SPEED, vy: -BASE_BALL_SPEED };
    scoreRef.current = 0;
    setScore(0);
    setRating('');
    setLevel(1);
    levelRef.current = 1;
    initBlocks();
    setGameState('playing');
    gameStateRef.current = 'playing';
  };
  const togglePause = () => { setGameState(gameState === 'playing' ? 'paused' : 'playing'); gameStateRef.current = gameState === 'playing' ? 'paused' : 'playing'; };
  const resetGame = () => { setGameState('waiting'); gameStateRef.current = 'waiting'; scoreRef.current = 0; setScore(0); setRating(''); setLevel(1); levelRef.current = 1; blocksRef.current = []; draw(); };

  useEffect(() => { draw(); }, [draw]);

  return (
    <div className="flex flex-col items-center space-y-4 p-4 sm:p-6 bg-gaming-dark rounded-lg w-full max-w-lg mx-auto">
      <div className="flex flex-col sm:flex-row justify-between w-full text-center gap-4">
        <div>
          <div className="text-xs sm:text-sm text-muted-foreground">Score</div>
          <div className="text-lg sm:text-2xl font-bold text-gaming-cyan">{score}</div>
        </div>
        <div>
          <div className="text-xs sm:text-sm text-muted-foreground">High Score</div>
          <div className="text-lg sm:text-2xl font-bold text-gaming-purple">{highScore}</div>
        </div>
      </div>

      <div className="relative border-2 border-border rounded-lg overflow-hidden neon-glow w-full">
        <canvas ref={canvasRef} width={canvasSize.width} height={canvasSize.height} className="block cursor-pointer w-full" style={{ height: `${canvasSize.height}px` }} />
      </div>

      <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4 w-full justify-center">
        {gameState === 'waiting' && (<Button onClick={startGame} className="bg-primary hover:bg-primary/80 neon-glow text-xs sm:text-sm py-2 sm:py-2 px-3 sm:px-4"><Play className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />Start Game</Button>)}
        {(gameState === 'playing' || gameState === 'paused') && (<><Button onClick={togglePause} variant="outline" className="border-primary text-primary text-xs sm:text-sm py-2 sm:py-2 px-3 sm:px-4">{gameState === 'playing' ? <Pause className="h-3 w-3 sm:h-4 sm:w-4 mr-2" /> : <Play className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />}{gameState === 'playing' ? 'Pause' : 'Resume'}</Button><Button onClick={resetGame} variant="outline" className="border-destructive text-destructive text-xs sm:text-sm py-2 sm:py-2 px-3 sm:px-4"><RotateCcw className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />Reset</Button></>)}
        {(gameState === 'gameOver' || gameState === 'win') && (<><Button onClick={startGame} className="bg-primary hover:bg-primary/80 neon-glow text-xs sm:text-sm py-2 sm:py-2 px-3 sm:px-4"><Play className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />Play Again</Button><Button onClick={resetGame} variant="outline" className="border-secondary text-secondary-foreground text-xs sm:text-sm py-2 sm:py-2 px-3 sm:px-4"><RotateCcw className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />Reset</Button></>)}
      </div>

      <div className="text-center text-xs sm:text-sm text-muted-foreground w-full">
        <p>🎮 Use <b>Mouse / Touch</b> or <b>A / D / Arrow Keys</b> to move the paddle</p>
        <p>Break all blocks to win. Don’t let the ball fall!</p>
      </div>
    </div>
  );
};

export default BlockBreakerGame;
