import React from 'react';
import { WordCategory } from '../types';
import { triggerHaptic } from '../utils/haptics';

interface CategoryChipsProps {
  selectedCategory: WordCategory;
  onSelectCategory: (category: WordCategory) => void;
}

const CATEGORIES: { id: WordCategory; labelPa: string; labelEn: string; icon: string }[] = [
  { id: 'all', labelPa: 'ਸਾਰੇ', labelEn: 'All', icon: '✨' },
  { id: 'verbs', labelPa: 'ਕਿਰਿਆਵਾਂ', labelEn: 'Verbs', icon: '⚡' },
  { id: 'questions', labelPa: 'ਸਵਾਲੀਆ', labelEn: 'Questions', icon: '❓' },
  { id: 'family', labelPa: 'ਪਰਿਵਾਰ', labelEn: 'Family', icon: '👨‍👩‍👧' },
  { id: 'connectors', labelPa: 'ਜੋੜਨ ਵਾਲੇ', labelEn: 'Connectors', icon: '🔗' },
  { id: 'grammar', labelPa: 'ਮੂਲ ਵਾਕ', labelEn: 'Grammar', icon: '📖' },
];

export const CategoryChips: React.FC<CategoryChipsProps> = ({
  selectedCategory,
  onSelectCategory,
}) => {
  const handleSelect = (id: WordCategory) => {
    if (id !== selectedCategory) {
      triggerHaptic('selection');
      onSelectCategory(id);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto px-3 py-1.5 overflow-x-auto no-scrollbar flex items-center gap-1.5 bg-[#001438]">
      {CATEGORIES.map((cat) => {
        const isSelected = selectedCategory === cat.id;
        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => handleSelect(cat.id)}
            className={`shrink-0 px-3 py-1 rounded-lg text-[11px] font-black transition-all flex items-center gap-1 ${
              isSelected
                ? 'bg-[#FF9933] text-[#00174D] border border-[#FFD700] shadow-sm'
                : 'bg-[#002270] text-[#88B0FF] border border-[#0033A0] hover:text-white active:scale-95'
            }`}
          >
            <span>{cat.icon}</span>
            <span className="font-gurmukhi">{cat.labelPa}</span>
            <span className="text-[9px] opacity-80 font-mono">({cat.labelEn})</span>
          </button>
        );
      })}
    </div>
  );
};

