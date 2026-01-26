// 결제 플로우 관련 상태 관리 훅

import { useState } from "react";

export function usePaymentFlow() {
  const [showPaymentSelection, setShowPaymentSelection] = useState(false);
  const [showPaymentProcessing, setShowPaymentProcessing] = useState(false);
  const [showPaymentComplete, setShowPaymentComplete] = useState(false);
  const [showPointUsage, setShowPointUsage] = useState(false);
  const [showSimplePayment, setShowSimplePayment] = useState(false);
  const [showStaffCallModal, setShowStaffCallModal] = useState(false);
  const [usedPoints, setUsedPoints] = useState(0);

  // 결제 완료 후 초기화
  const resetPaymentFlow = () => {
    setShowPaymentComplete(false);
    setShowPaymentProcessing(false);
    setShowPaymentSelection(false);
    setShowPointUsage(false);
    setShowSimplePayment(false);
    setUsedPoints(0);
  };

  // 포인트 사용 완료
  const handlePointUsageComplete = (points: number) => {
    setUsedPoints(points);
    setShowPointUsage(false);
    setShowPaymentProcessing(true);
  };

  // 간편결제 완료
  const handleSimplePaymentComplete = () => {
    setShowSimplePayment(false);
    setShowPaymentComplete(true);
  };

  return {
    // 상태
    showPaymentSelection,
    showPaymentProcessing,
    showPaymentComplete,
    showPointUsage,
    showSimplePayment,
    showStaffCallModal,
    usedPoints,

    // 세터
    setShowPaymentSelection,
    setShowPaymentProcessing,
    setShowPaymentComplete,
    setShowPointUsage,
    setShowSimplePayment,
    setShowStaffCallModal,

    // 핸들러
    resetPaymentFlow,
    handlePointUsageComplete,
    handleSimplePaymentComplete,
  };
}
