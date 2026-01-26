interface SpeechBubbleProps {
  message: string;
}

export default function SpeechBubble({ message }: SpeechBubbleProps) {
  return (
    <div
      className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center"
      style={{
        bottom: "544px",
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
      }}
    >
      {message}
    </div>
  );
}
