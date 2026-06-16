import React, { useMemo } from 'react';
import './SimulatedKeyboard.css';

const ABNT2_LAYOUT = [
  // Row 1
  [
    { id: 'Quote', main: "'", shift: '"', altGr: '', finger: 'pinky-l', width: 'w-10' },
    { id: 'Digit1', main: '1', shift: '!', altGr: '¹', finger: 'pinky-l', width: 'w-10' },
    { id: 'Digit2', main: '2', shift: '@', altGr: '²', finger: 'ring-l', width: 'w-10' },
    { id: 'Digit3', main: '3', shift: '#', altGr: '³', finger: 'middle-l', width: 'w-10' },
    { id: 'Digit4', main: '4', shift: '$', altGr: '£', finger: 'index-l', width: 'w-10' },
    { id: 'Digit5', main: '5', shift: '%', altGr: '¢', finger: 'index-l', width: 'w-10' },
    { id: 'Digit6', main: '6', shift: '¨', altGr: '¬', finger: 'index-r', width: 'w-10' },
    { id: 'Digit7', main: '7', shift: '&', altGr: '', finger: 'index-r', width: 'w-10' },
    { id: 'Digit8', main: '8', shift: '*', altGr: '', finger: 'middle-r', width: 'w-10' },
    { id: 'Digit9', main: '9', shift: '(', altGr: '', finger: 'ring-r', width: 'w-10' },
    { id: 'Digit0', main: '0', shift: ')', altGr: '', finger: 'pinky-r', width: 'w-10' },
    { id: 'Minus', main: '-', shift: '_', altGr: '', finger: 'pinky-r', width: 'w-10' },
    { id: 'Equal', main: '=', shift: '+', altGr: '§', finger: 'pinky-r', width: 'w-10' },
    { id: 'Backspace', main: 'Backspace', isSpecial: true, finger: 'pinky-r', width: 'w-24' },
  ],
  // Row 2
  [
    { id: 'Tab', main: 'Tab', isSpecial: true, finger: 'pinky-l', width: 'w-16' },
    { id: 'KeyQ', main: 'Q', shift: 'Q', altGr: '/', finger: 'pinky-l', width: 'w-10' },
    { id: 'KeyW', main: 'W', shift: 'W', altGr: '?', finger: 'ring-l', width: 'w-10' },
    { id: 'KeyE', main: 'E', shift: 'E', altGr: '°', finger: 'middle-l', width: 'w-10' },
    { id: 'KeyR', main: 'R', shift: 'R', altGr: '', finger: 'index-l', width: 'w-10' },
    { id: 'KeyT', main: 'T', shift: 'T', altGr: '', finger: 'index-l', width: 'w-10' },
    { id: 'KeyY', main: 'Y', shift: 'Y', altGr: '', finger: 'index-r', width: 'w-10' },
    { id: 'KeyU', main: 'U', shift: 'U', altGr: '', finger: 'index-r', width: 'w-10' },
    { id: 'KeyI', main: 'I', shift: 'I', altGr: '', finger: 'middle-r', width: 'w-10' },
    { id: 'KeyO', main: 'O', shift: 'O', altGr: '', finger: 'ring-r', width: 'w-10' },
    { id: 'KeyP', main: 'P', shift: 'P', altGr: '', finger: 'pinky-r', width: 'w-10' },
    { id: 'Acute', main: '´', shift: '`', altGr: '', finger: 'pinky-r', width: 'w-10' },
    { id: 'BracketLeft', main: '[', shift: '{', altGr: 'ª', finger: 'pinky-r', width: 'w-10' },
    { id: 'Enter', main: 'Enter', isSpecial: true, finger: 'pinky-r', width: 'w-16 h-[5.5rem] absolute right-0 -mt-1 rounded-bl-none z-10' },
  ],
  // Row 3
  [
    { id: 'CapsLock', main: 'Caps Lock', isSpecial: true, finger: 'pinky-l', width: 'w-20' },
    { id: 'KeyA', main: 'A', shift: 'A', altGr: '', finger: 'pinky-l', width: 'w-10', home: true },
    { id: 'KeyS', main: 'S', shift: 'S', altGr: '', finger: 'ring-l', width: 'w-10', home: true },
    { id: 'KeyD', main: 'D', shift: 'D', altGr: '', finger: 'middle-l', width: 'w-10', home: true },
    { id: 'KeyF', main: 'F', shift: 'F', altGr: '', finger: 'index-l', width: 'w-10', home: true, bump: true },
    { id: 'KeyG', main: 'G', shift: 'G', altGr: '', finger: 'index-l', width: 'w-10' },
    { id: 'KeyH', main: 'H', shift: 'H', altGr: '', finger: 'index-r', width: 'w-10' },
    { id: 'KeyJ', main: 'J', shift: 'J', altGr: '', finger: 'index-r', width: 'w-10', home: true, bump: true },
    { id: 'KeyK', main: 'K', shift: 'K', altGr: '', finger: 'middle-r', width: 'w-10', home: true },
    { id: 'KeyL', main: 'L', shift: 'L', altGr: '', finger: 'ring-r', width: 'w-10', home: true },
    { id: 'KeyCCedilla', main: 'Ç', shift: 'Ç', altGr: '', finger: 'pinky-r', width: 'w-10', home: true },
    { id: 'Tilde', main: '~', shift: '^', altGr: '', finger: 'pinky-r', width: 'w-10' },
    { id: 'BracketRight', main: ']', shift: '}', altGr: 'º', finger: 'pinky-r', width: 'w-10' },
    { id: 'EnterSpacer', main: '', isSpecial: true, width: 'w-[3.25rem] invisible' }
  ],
  // Row 4
  [
    { id: 'ShiftLeft', main: 'Shift', isSpecial: true, finger: 'pinky-l', width: 'w-14' },
    { id: 'Backslash', main: '\\', shift: '|', altGr: '', finger: 'pinky-l', width: 'w-10' },
    { id: 'KeyZ', main: 'Z', shift: 'Z', altGr: '', finger: 'pinky-l', width: 'w-10' },
    { id: 'KeyX', main: 'X', shift: 'X', altGr: '', finger: 'ring-l', width: 'w-10' },
    { id: 'KeyC', main: 'C', shift: 'C', altGr: '', finger: 'middle-l', width: 'w-10' },
    { id: 'KeyV', main: 'V', shift: 'V', altGr: '', finger: 'index-l', width: 'w-10' },
    { id: 'KeyB', main: 'B', shift: 'B', altGr: '', finger: 'index-l', width: 'w-10' },
    { id: 'KeyN', main: 'N', shift: 'N', altGr: '', finger: 'index-r', width: 'w-10' },
    { id: 'KeyM', main: 'M', shift: 'M', altGr: '', finger: 'index-r', width: 'w-10' },
    { id: 'Comma', main: ',', shift: '<', altGr: '', finger: 'middle-r', width: 'w-10' },
    { id: 'Period', main: '.', shift: '>', altGr: '', finger: 'ring-r', width: 'w-10' },
    { id: 'Semicolon', main: ';', shift: ':', altGr: '', finger: 'pinky-r', width: 'w-10' },
    { id: 'Slash', main: '/', shift: '?', altGr: '°', finger: 'pinky-r', width: 'w-10' },
    { id: 'ShiftRight', main: 'Shift', isSpecial: true, finger: 'pinky-r', width: 'w-24' },
  ],
  // Row 5
  [
    { id: 'ControlLeft', main: 'Ctrl', isSpecial: true, finger: 'pinky-l', width: 'w-14' },
    { id: 'MetaLeft', main: 'Win', isSpecial: true, finger: 'thumb-l', width: 'w-12' },
    { id: 'AltLeft', main: 'Alt', isSpecial: true, finger: 'thumb-l', width: 'w-12' },
    { id: 'Space', main: '', isSpecial: true, finger: 'thumb-l', width: 'flex-grow min-w-[15rem]' },
    { id: 'AltRight', main: 'Alt Gr', isSpecial: true, finger: 'thumb-r', width: 'w-12' },
    { id: 'MetaRight', main: 'Win', isSpecial: true, finger: 'thumb-r', width: 'w-12' },
    { id: 'ContextMenu', main: 'Menu', isSpecial: true, finger: 'thumb-r', width: 'w-12' },
    { id: 'ControlRight', main: 'Ctrl', isSpecial: true, finger: 'pinky-r', width: 'w-14' },
  ]
];

const FINGER_COLORS = {
  'pinky-l': 'bg-pink-100/50 dark:bg-pink-900/20 border-pink-200 dark:border-pink-800/50',
  'ring-l': 'bg-purple-100/50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800/50',
  'middle-l': 'bg-blue-100/50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/50',
  'index-l': 'bg-cyan-100/50 dark:bg-cyan-900/20 border-cyan-200 dark:border-cyan-800/50',
  'thumb-l': 'bg-teal-100/50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-800/50',
  'thumb-r': 'bg-teal-100/50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-800/50',
  'index-r': 'bg-green-100/50 dark:bg-green-900/20 border-green-200 dark:border-green-800/50',
  'middle-r': 'bg-yellow-100/50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800/50',
  'ring-r': 'bg-orange-100/50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800/50',
  'pinky-r': 'bg-red-100/50 dark:bg-red-900/20 border-red-200 dark:border-red-800/50',
  'default': 'bg-gray-100/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700/50'
};

const MODIFIERS = {
  SHIFT: ['ShiftLeft', 'ShiftRight'],
  ALT_GR: ['AltRight'],
};

const mapCharToKey = (char) => {
  if (!char) return { targetId: null, modifierIds: [] };
  
  if (char === ' ') return { targetId: 'Space', modifierIds: [] };
  if (char === '\n') return { targetId: 'Enter', modifierIds: [] };

  const target = char;
  
  for (const row of ABNT2_LAYOUT) {
    for (const key of row) {
      if (key.isSpecial) continue;
      
      if (key.main === target) return { targetId: key.id, modifierIds: [] };
      if (key.shift === target) {
        // If it's a left hand key, use right shift, else left shift (best practice)
        const isLeftHand = key.finger.endsWith('-l');
        const shiftId = isLeftHand ? 'ShiftRight' : 'ShiftLeft';
        return { targetId: key.id, modifierIds: [shiftId] };
      }
      if (key.altGr === target) return { targetId: key.id, modifierIds: ['AltRight'] };
      
      // Accents mapping (dead keys logic would be more complex, keeping simple mapping)
      // á, é, í, ó, ú, Á, É, Í, Ó, Ú
      const acuteAccents = { 'á': 'A', 'é': 'E', 'í': 'I', 'ó': 'O', 'ú': 'U' };
      const acuteAccentsUpper = { 'Á': 'A', 'É': 'E', 'Í': 'I', 'Ó': 'O', 'Ú': 'U' };
      const tildeAccents = { 'ã': 'A', 'õ': 'O' };
      const tildeAccentsUpper = { 'Ã': 'A', 'Õ': 'O' };
      const circumflexAccents = { 'â': 'A', 'ê': 'E', 'ô': 'O' };
      const circumflexAccentsUpper = { 'Â': 'A', 'Ê': 'E', 'Ô': 'O' };
      const graveAccents = { 'à': 'A' };
      const graveAccentsUpper = { 'À': 'A' };

      if (acuteAccents[target]) return { targetId: 'Acute', modifierIds: [] }; // The accent key itself
      if (acuteAccentsUpper[target]) return { targetId: 'Acute', modifierIds: ['ShiftLeft'] };
      if (tildeAccents[target]) return { targetId: 'Tilde', modifierIds: [] };
      if (tildeAccentsUpper[target]) return { targetId: 'Tilde', modifierIds: ['ShiftLeft'] };
      if (circumflexAccents[target]) return { targetId: 'Tilde', modifierIds: ['ShiftLeft'] };
      if (circumflexAccentsUpper[target]) return { targetId: 'Tilde', modifierIds: ['ShiftLeft'] }; // Need Shift for ^
      if (graveAccents[target]) return { targetId: 'Acute', modifierIds: ['ShiftLeft'] }; // Need Shift for `
      if (graveAccentsUpper[target]) return { targetId: 'Acute', modifierIds: ['ShiftLeft'] };
    }
  }

  // Fallback case-insensitive check if strictly letter
  const upperChar = char.toUpperCase();
  for (const row of ABNT2_LAYOUT) {
    for (const key of row) {
      if (!key.isSpecial && key.main.toUpperCase() === upperChar) {
         if (char === upperChar && char !== char.toLowerCase()) {
            const isLeftHand = key.finger.endsWith('-l');
            return { targetId: key.id, modifierIds: [isLeftHand ? 'ShiftRight' : 'ShiftLeft'] };
         }
         return { targetId: key.id, modifierIds: [] };
      }
    }
  }

  return { targetId: null, modifierIds: [] };
};

const SimulatedKeyboard = ({ expectedKey }) => {
  const { targetId, modifierIds } = useMemo(() => mapCharToKey(expectedKey), [expectedKey]);

  return (
    <div className="simulated-keyboard-container max-w-4xl mx-auto bg-white/50 dark:bg-black/20 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 backdrop-blur-sm shadow-xl relative mt-4">
      <div className="flex flex-col gap-2 relative">
        {ABNT2_LAYOUT.map((row, rowIndex) => (
          <div key={rowIndex} className="flex justify-center gap-2 relative">
            {row.map((key) => {
              const isTarget = key.id === targetId;
              const isModifier = modifierIds.includes(key.id);
              const isActive = isTarget || isModifier;
              
              const fingerColorClass = FINGER_COLORS[key.finger] || FINGER_COLORS['default'];
              
              return (
                <div
                  key={key.id}
                  className={`
                    key-cap
                    ${key.width}
                    h-10
                    rounded-lg
                    border-b-4
                    flex flex-col items-center justify-center
                    relative
                    transition-all duration-300
                    select-none
                    ${isActive 
                      ? 'bg-green-400 border-green-600 dark:bg-green-500 dark:border-green-700 text-white shadow-[0_0_15px_rgba(74,222,128,0.6)] transform -translate-y-1 z-20' 
                      : `${fingerColorClass} text-gray-700 dark:text-gray-300 opacity-90`}
                  `}
                >
                  {/* Home row bump */}
                  {key.bump && (
                    <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-3 h-0.5 bg-gray-400 dark:bg-gray-500 rounded-full" />
                  )}

                  {key.isSpecial ? (
                    <span className="text-[10px] font-bold uppercase tracking-wider">{key.main}</span>
                  ) : (
                    <div className="flex flex-col items-center justify-center w-full h-full leading-none text-xs">
                       <div className="flex w-full justify-between px-1.5 opacity-70 mb-0.5">
                         <span>{key.shift}</span>
                         <span className="text-[9px] text-blue-600 dark:text-blue-400">{key.altGr}</span>
                       </div>
                       <span className="font-bold text-sm">{key.main}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

export default SimulatedKeyboard;
