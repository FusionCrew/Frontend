interface SpeechBubbleProps {
  message: string;
  bottom?: string;
}

export default function SpeechBubble({ message, bottom = "544px" }: SpeechBubbleProps) {
  return (
    <div
      className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center text-center px-8"
      style={{
        bottom,
        width: "791px",
        height: "200px",
        backgroundColor: "#FFFFFF",
        borderRadius: "100px",
        boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
        fontFamily: "'Noto Sans KR', sans-serif",
        fontSize: "56px",
        fontWeight: "500",
        color: "#4A3728",
        zIndex: 3,
        transition: "bottom 0.3s ease-in-out",
        pointerEvents: "none",
      }}
    >
      {message}
    </div>
  );
}
