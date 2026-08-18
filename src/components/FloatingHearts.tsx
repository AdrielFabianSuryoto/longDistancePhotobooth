export function FloatingHearts() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {[...Array(7)].map((_, i) => (
        <div
          key={i}
          className="animate-float-heart absolute"
          style={{
            left: `${8 + i * 13}%`,
            bottom: "-30px",
            animationDelay: `${i * 1.1}s`,
            animationDuration: `${7 + (i % 3) * 2}s`,
            fontSize: `${14 + (i % 4) * 5}px`,
            color: i % 2 === 0 ? "#C97B84" : "#D4A373",
            opacity: 0.18,
          }}
        >
          ♥
        </div>
      ))}
    </div>
  );
}
