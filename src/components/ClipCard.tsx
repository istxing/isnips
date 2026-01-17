import React from 'react';
import { ClipCard as ClipCardType } from '../types';

interface ClipCardProps {
  card: ClipCardType;
  onClick: (card: ClipCardType) => void;
}

export const ClipCardComponent: React.FC<ClipCardProps> = ({ card, onClick }) => {
  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`;

    return date.toLocaleDateString('zh-CN');
  };

  return (
    <div
      className="clip-card"
      onClick={() => onClick(card)}
    >
      <div className="clip-text">
        {card.clipText}
      </div>
      <div className="clip-meta">
        <div className="clip-domain">
          {card.domain}
        </div>
        <div className="clip-date">
          {formatDate(card.createdAt)}
        </div>
      </div>
    </div>
  );
};
