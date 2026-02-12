// 결제 관련 화면들을 렌더링하는 컴포넌트

import PaymentSelectionScreen from "../kiosk_page/PaymentSelectionScreen";
import PaymentProcessingScreen from "../kiosk_page/PaymentProcessingScreen";
import PaymentCompleteScreen from "../kiosk_page/PaymentCompleteScreen";
import PointUsageScreen from "../kiosk_page/PointUsageScreen";
import SimplePaymentScreen from "../kiosk_page/SimplePaymentScreen";
import StaffCallModal from "./StaffCallModal";

interface PaymentFlowProps {
  // 상태
  showPaymentSelection: boolean;
  showPaymentProcessing: boolean;
  showPaymentComplete: boolean;
  showPointUsage: boolean;
  showSimplePayment: boolean;
  showStaffCallModal: boolean;
  usedPoints: number;
  totalAmount: number;

  // 핸들러
  onClosePaymentSelection: () => void;
  onSelectCard: () => void;
  onSelectPoint: () => void;
  onSelectSimple: () => void;
  onClosePaymentProcessing: () => void;
  onPaymentComplete: () => void;
  onClosePointUsage: () => void;
  onPointUsageComplete: (points: number) => void;
  onCloseSimplePayment: () => void;
  onSimplePaymentComplete: () => void;
  onPaymentDone: () => void;
  onCloseStaffModal: () => void;
  ticketNumber: string | null;
}

export default function PaymentFlow({
  showPaymentSelection,
  showPaymentProcessing,
  showPaymentComplete,
  showPointUsage,
  showSimplePayment,
  showStaffCallModal,
  usedPoints,
  totalAmount,
  onClosePaymentSelection,
  onSelectCard,
  onSelectPoint,
  onSelectSimple,
  onClosePaymentProcessing,
  onPaymentComplete,
  onClosePointUsage,
  onPointUsageComplete,
  onCloseSimplePayment,
  onSimplePaymentComplete,
  onPaymentDone,
  onCloseStaffModal,
  ticketNumber
}: PaymentFlowProps) {
  return (
    <>
      {showPaymentSelection && (
        <PaymentSelectionScreen
          onBack={onClosePaymentSelection}
          onSelectCard={onSelectCard}
          onSelectPoint={onSelectPoint}
          onSelectSimple={onSelectSimple}
        />
      )}

      {showPointUsage && (
        <PointUsageScreen
          onBack={onClosePointUsage}
          onComplete={onPointUsageComplete}
          totalAmount={totalAmount}
        />
      )}

      {showPaymentProcessing && (
        <PaymentProcessingScreen
          totalAmount={totalAmount}
          discountAmount={usedPoints}
          onBack={onClosePaymentProcessing}
          onComplete={onPaymentComplete}
        />
      )}

      {showSimplePayment && (
        <SimplePaymentScreen
          totalAmount={totalAmount}
          onBack={onCloseSimplePayment}
          onComplete={onSimplePaymentComplete}
        />
      )}

      {showPaymentComplete && (
        <PaymentCompleteScreen onClose={onPaymentDone} ticketNumber={ticketNumber} />
      )}

      <StaffCallModal
        isOpen={showStaffCallModal}
        onClose={onCloseStaffModal}
      />
    </>
  );
}
