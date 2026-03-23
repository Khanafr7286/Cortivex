import { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, ChevronDown } from 'lucide-react';
import clsx from 'clsx';

interface TerminalLine {
  type: string;
  text: string;
}

interface TerminalOutputProps {
  lines: TerminalLine[];
  title?: string;
  maxHeight?: string;
  showCopy?: boolean;
  className?: string;
}

export function TerminalOutput({
  lines,
  title,
  maxHeight = '300px',
  showCopy = true,
  className,
}: TerminalOutputProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isAutoScroll = useRef(true);

  // Auto-scroll to bottom when new lines added
  useEffect(() => {
    if (scrollRef.current && isAutoScroll.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines.length]);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    isAutoScroll.current = scrollHeight - scrollTop - clientHeight < 40;
  };

  const handleCopy = () => {
    const text = lines.map((l) => l.text).join('\n');
    navigator.clipboard.writeText(text);
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      isAutoScroll.current = true;
    }
  };

  return (
    <div
      className={clsx(
        'rounded-lg overflow-hidden border border-border-dim bg-[#0c0c14]',
        className,
      )}
    >
      {/* Header */}
      {(title || showCopy) && (
        <div className="flex items-center justify-between px-3 py-1.5 bg-surface/80 border-b border-border-dim">
          <div className="flex items-center gap-2">
            {/* Terminal dots */}
            <div className="flex gap-1">
              <div className="w-2.5 h-2.5 rounded-full bg-error-coral/60" />
              <div className="w-2.5 h-2.5 rounded-full bg-warning-amber/60" />
              <div className="w-2.5 h-2.5 rounded-full bg-success-green/60" />
            </div>
            {title && (
              <span className="text-[11px] font-mono text-text-muted ml-2">
                {title}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {showCopy && (
              <button
                onClick={handleCopy}
                className="p-1 rounded hover:bg-white/5 text-text-muted hover:text-text-primary transition-colors"
                title="Copy output"
              >
                <Copy size={12} />
              </button>
            )}
            <button
              onClick={scrollToBottom}
              className="p-1 rounded hover:bg-white/5 text-text-muted hover:text-text-primary transition-colors"
              title="Scroll to bottom"
            >
              <ChevronDown size={12} />
            </button>
          </div>
        </div>
      )}

      {/* Terminal content */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="terminal overflow-y-auto p-3"
        style={{ maxHeight }}
      >
        <AnimatePresence initial={false}>
          {lines.map((line, i) => (
            <motion.div
              key={i}
              className={clsx('terminal-line', line.type)}
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.15 }}
            >
              <span className="text-text-dim mr-2 select-none text-[10px]">
                {String(i + 1).padStart(3, ' ')}
              </span>
              {line.type === 'system' && (
                <span className="text-text-dim mr-1">[SYS]</span>
              )}
              {line.type === 'stderr' && (
                <span className="text-error-coral mr-1">[ERR]</span>
              )}
              {line.type === 'progress' && (
                <span className="text-cortivex-cyan mr-1">[...]</span>
              )}
              {line.type === 'cost' && (
                <span className="text-warning-amber mr-1">[$$$]</span>
              )}
              {line.text}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Blinking cursor */}
        <div className="terminal-line">
          <span className="text-text-dim mr-2 select-none text-[10px]">
            {String(lines.length + 1).padStart(3, ' ')}
          </span>
          <span className="inline-block w-2 h-3.5 bg-cortivex-cyan/70 animate-pulse" />
        </div>
      </div>
    </div>
  );
}
