import React from 'react';

export interface HistoryCollapseProps {
  tokenId?: string;
  showLoading?: boolean;
}

declare const HistoryCollapse: React.FC<HistoryCollapseProps>;

export default HistoryCollapse;
