import React from 'react';
import { Check, CheckCheck, Clock } from 'lucide-react';
import type { Message } from '../types';

type Status = Message['status'];

interface ReceiptTicksProps {
  status: Status | null | undefined;
  size?: number;
  className?: string;
}

/**
 * WhatsApp tick states:
 *   clock          = sending
 *   one grey tick  = sent to server
 *   two grey ticks = delivered
 *   two blue ticks = read
 */
export const ReceiptTicks: React.FC<ReceiptTicksProps> = ({ status, size = 14, className }) => {
  if (!status) return null;
  const label =
    status === 'READ' ? 'Read' : status === 'DELIVERED' ? 'Delivered' : status === 'PENDING' ? 'Sending' : 'Sent';
  return (
    <span
      className={`receipt-ticks receipt-${status.toLowerCase()} ${className ?? ''}`.trim()}
      title={label}
      aria-label={label}
      role="img"
      style={{ display: 'inline-flex', alignItems: 'center', color: status === 'READ' ? '#53bdeb' : 'currentColor' }}
    >
      {status === 'PENDING' ? <Clock size={size - 2} /> : status === 'SENT' ? <Check size={size} /> : <CheckCheck size={size} />}
    </span>
  );
};
