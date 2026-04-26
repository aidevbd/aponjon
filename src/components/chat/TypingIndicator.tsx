import { motion } from "framer-motion";

export function TypingIndicator({ name }: { name?: string }) {
  return (
    <div className="flex items-end gap-1.5 px-2 mb-1">
      <div className="bg-card border border-border rounded-2xl rounded-bl-md px-3 py-2 flex items-center gap-1 shadow-sm">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-muted-foreground/70"
            animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1, delay: i * 0.15, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}
      </div>
      {name && <span className="text-[10px] text-muted-foreground">{name} লিখছেন</span>}
    </div>
  );
}
