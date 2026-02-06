interface QuantityControlProps {
  quantity: number;
  onDecrease: () => void;
  onIncrease: () => void;
  variant?: "default" | "cart";
}

export default function QuantityControl({
  quantity,
  onDecrease,
  onIncrease,
  variant = "default",
}: QuantityControlProps) {
  const isCart = variant === "cart";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        width: isCart ? "auto" : "189px",
        height: isCart ? "auto" : "72px",
        border: isCart ? "2px solid #561D02" : "2px solid #E8A756",
        borderRadius: isCart ? "35px" : "36px",
        padding: isCart ? "15px 30px" : "0 20px",
        gap: isCart ? "30px" : "0",
      }}
    >
      <button
        onClick={onDecrease}
        style={{
          background: "none",
          border: "none",
          color: isCart ? "#561D02" : "#E8A756",
          fontSize: isCart ? "32px" : "30px",
          fontWeight: isCart ? "600" : "500",
          cursor: "pointer",
          padding: "0",
          lineHeight: "1",
        }}
      >
        −
      </button>
      <span
        style={{
          fontFamily: "'Noto Sans KR', sans-serif",
          fontSize: isCart ? "32px" : "30px",
          fontWeight: isCart ? "600" : "500",
          color: isCart ? "#561D02" : "#4A3728",
          minWidth: isCart ? "30px" : "auto",
          textAlign: "center",
        }}
      >
        {quantity}
      </span>
      <button
        onClick={onIncrease}
        style={{
          background: "none",
          border: "none",
          color: isCart ? "#561D02" : "#E8A756",
          fontSize: isCart ? "32px" : "30px",
          fontWeight: isCart ? "600" : "500",
          cursor: "pointer",
          padding: "0",
          lineHeight: "1",
        }}
      >
        +
      </button>
    </div>
  );
}
