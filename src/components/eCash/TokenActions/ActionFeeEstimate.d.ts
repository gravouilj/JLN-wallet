import React from 'react';

export interface ActionFeeEstimateProps {
  actionType: 'send' | 'airdrop' | 'mint' | 'burn' | 'message';
  params?: Record<string, any>;
  onFeeCalculated?: (fee: number) => void;
  compact?: boolean;
}

declare const ActionFeeEstimate: React.FC<ActionFeeEstimateProps>;

export default ActionFeeEstimate;
