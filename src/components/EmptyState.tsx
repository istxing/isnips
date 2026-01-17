import React from 'react';
import { useI18n } from '../hooks/useI18n';

export const EmptyState: React.FC = () => {
  const { t } = useI18n();

  return (
    <div className="col-span-full text-center py-20">
      <div className="text-6xl mb-6">📝</div>
      <h3 className="text-xl font-semibold text-gray-900 mb-3">
        {t('no_clips_title', '暂无摘录')}
      </h3>
      <p className="text-gray-600 max-w-md mx-auto">
        {t('no_clips_desc', '选中网页文本后按 Ctrl+C 保存')}
      </p>
    </div>
  );
};
