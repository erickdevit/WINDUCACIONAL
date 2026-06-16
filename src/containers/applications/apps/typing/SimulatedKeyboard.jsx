import React, { useMemo } from 'react';
import './SimulatedKeyboard.css';

const UNIT = 38;
const GAP = 2;

const getWidth = (u) => `${u * UNIT + (u - 1) * GAP}px`;
const getHeight = (u) => `${u * UNIT + (u - 1) * GAP}px`;

const ABNT2_LAYOUT = [
  // Row 1
  [
    { id: 'Quote', main: "'", shift: '"', altGr: '', finger: 'pinky-l', u: 1 },
    { id: 'Digit1', main: '1', shift: '!', altGr: '¹', finger: 'pinky-l', u: 1 },
    { id: 'Digit2', main: '2', shift: '@', altGr: '²', finger: 'ring-l', u: 1 },
    { id: 'Digit3', main: '3', shift: '#', altGr: '³', finger: 'middle-l', u: 1 },
    { id: 'Digit4', main: '4', shift: '$', altGr: '£', finger: 'index-l', u: 1 },
    { id: 'Digit5', main: '5', shift: '%', altGr: '¢', finger: 'index-l', u: 1 },
    { id: 'Digit6', main: '6', shift: '¨', altGr: '¬', finger: 'index-r', u: 1 },
    { id: 'Digit7', main: '7', shift: '&', altGr: '', finger: 'index-r', u: 1 },
    { id: 'Digit8', main: '8', shift: '*', altGr: '', finger: 'middle-r', u: 1 },
    { id: 'Digit9', main: '9', shift: '(', altGr: '', finger: 'ring-r', u: 1 },
    { id: 'Digit0', main: '0', shift: ')', altGr: '', finger: 'pinky-r', u: 1 },
    { id: 'Minus', main: '-', shift: '_', altGr: '', finger: 'pinky-r', u: 1 },
    { id: 'Equal', main: '=', shift: '+', altGr: '§', finger: 'pinky-r', u: 1 },
    { id: 'Backspace', main: 'Backspace', isSpecial: true, finger: 'pinky-r', u: 2 },
  ],
  // Row 2
  [
    { id: 'Tab', main: 'Tab', isSpecial: true, finger: 'pinky-l', u: 1.5 },
    { id: 'KeyQ', main: 'Q', shift: 'Q', altGr: '/', finger: 'pinky-l', u: 1 },
    { id: 'KeyW', main: 'W', shift: 'W', altGr: '?', finger: 'ring-l', u: 1 },
    { id: 'KeyE', main: 'E', shift: 'E', altGr: '°', finger: 'middle-l', u: 1 },
    { id: 'KeyR', main: 'R', shift: 'R', altGr: '', finger: 'index-l', u: 1 },
    { id: 'KeyT', main: 'T', shift: 'T', altGr: '', finger: 'index-l', u: 1 },
    { id: 'KeyY', main: 'Y', shift: 'Y', altGr: '', finger: 'index-r', u: 1 },
    { id: 'KeyU', main: 'U', shift: 'U', altGr: '', finger: 'index-r', u: 1 },
    { id: 'KeyI', main: 'I', shift: 'I', altGr: '', finger: 'middle-r', u: 1 },
    { id: 'KeyO', main: 'O', shift: 'O', altGr: '', finger: 'ring-r', u: 1 },
    { id: 'KeyP', main: 'P', shift: 'P', altGr: '', finger: 'pinky-r', u: 1 },
    { id: 'Acute', main: '´', shift: '`', altGr: '', finger: 'pinky-r', u: 1 },
    { id: 'BracketLeft', main: '[', shift: '{', altGr: 'ª', finger: 'pinky-r', u: 1 },
    { id: 'Enter', main: 'Enter', isSpecial: true, finger: 'pinky-r', u: 1.5, enterPiece: 'top' },
  ],
  // Row 3
  [
    { id: 'CapsLock', main: 'Caps Lock', isSpecial: true, finger: 'pinky-l', u: 1.75 },
    { id: 'KeyA', main: 'A', shift: 'A', altGr: '', finger: 'pinky-l', u: 1, home: true },
    { id: 'KeyS', main: 'S', shift: 'S', altGr: '', finger: 'ring-l', u: 1, home: true },
    { id: 'KeyD', main: 'D', shift: 'D', altGr: '', finger: 'middle-l', u: 1, home: true },
    { id: 'KeyF', main: 'F', shift: 'F', altGr: '', finger: 'index-l', u: 1, home: true, bump: true },
    { id: 'KeyG', main: 'G', shift: 'G', altGr: '', finger: 'index-l', u: 1 },
    { id: 'KeyH', main: 'H', shift: 'H', altGr: '', finger: 'index-r', u: 1 },
    { id: 'KeyJ', main: 'J', shift: 'J', altGr: '', finger: 'index-r', u: 1, home: true, bump: true },
    { id: 'KeyK', main: 'K', shift: 'K', altGr: '', finger: 'middle-r', u: 1, home: true },
    { id: 'KeyL', main: 'L', shift: 'L', altGr: '', finger: 'ring-r', u: 1, home: true },
    { id: 'KeyCCedilla', main: 'Ç', shift: 'Ç', altGr: '', finger: 'pinky-r', u: 1, home: true },
    { id: 'Tilde', main: '~', shift: '^', altGr: '', finger: 'pinky-r', u: 1 },
    { id: 'BracketRight', main: ']', shift: '}', altGr: 'º', finger: 'pinky-r', u: 1 },
    { id: 'Enter', main: '', isSpecial: true, finger: 'pinky-r', u: 1.25, enterPiece: 'bottom' },
  ],
  // Row 4
  [
    { id: 'ShiftLeft', main: 'Shift', isSpecial: true, finger: 'pinky-l', u: 1.25 },
    { id: 'Backslash', main: '\\', shift: '|', altGr: '', finger: 'pinky-l', u: 1 },
    { id: 'KeyZ', main: 'Z', shift: 'Z', altGr: '', finger: 'pinky-l', u: 1 },
    { id: 'KeyX', main: 'X', shift: 'X', altGr: '', finger: 'ring-l', u: 1 },
    { id: 'KeyC', main: 'C', shift: 'C', altGr: '', finger: 'middle-l', u: 1 },
    { id: 'KeyV', main: 'V', shift: 'V', altGr: '', finger: 'index-l', u: 1 },
    { id: 'KeyB', main: 'B', shift: 'B', altGr: '', finger: 'index-l', u: 1 },
    { id: 'KeyN', main: 'N', shift: 'N', altGr: '', finger: 'index-r', u: 1 },
    { id: 'KeyM', main: 'M', shift: 'M', altGr: '', finger: 'index-r', u: 1 },
    { id: 'Comma', main: ',', shift: '<', altGr: '', finger: 'middle-r', u: 1 },
    { id: 'Period', main: '.', shift: '>', altGr: '', finger: 'ring-r', u: 1 },
    { id: 'Semicolon', main: ';', shift: ':', altGr: '', finger: 'pinky-r', u: 1 },
    { id: 'Slash', main: '/', shift: '?', altGr: '°', finger: 'pinky-r', u: 1 },
    { id: 'ShiftRight', main: 'Shift', isSpecial: true, finger: 'pinky-r', u: 2.75 },
  ],
  // Row 5
  [
    { id: 'ControlLeft', main: 'Ctrl', isSpecial: true, finger: 'pinky-l', u: 1.25 },
    { id: 'MetaLeft', main: 'Win', isSpecial: true, finger: 'thumb-l', u: 1.25 },
    { id: 'AltLeft', main: 'Alt', isSpecial: true, finger: 'thumb-l', u: 1.25 },
    { id: 'Space', main: '', isSpecial: true, finger: 'thumb-l', u: 6.25 },
    { id: 'AltRight', main: 'Alt Gr', isSpecial: true, finger: 'thumb-r', u: 1.25 },
    { id: 'MetaRight', main: 'Win', isSpecial: true, finger: 'thumb-r', u: 1.25 },
    { id: 'ContextMenu', main: 'Menu', isSpecial: true, finger: 'thumb-r', u: 1.25 },
    { id: 'ControlRight', main: 'Ctrl', isSpecial: true, finger: 'pinky-r', u: 1.25 },
  ]
];

const FINGER_COLORS = {
  'pinky-l': 'bg-pink-100/60 dark:bg-pink-900/40 border-pink-200 dark:border-pink-800/60',
  'ring-l': 'bg-purple-100/60 dark:bg-purple-900/40 border-purple-200 dark:border-purple-800/60',
  'middle-l': 'bg-blue-100/60 dark:bg-blue-900/40 border-blue-200 dark:border-blue-800/60',
  'index-l': 'bg-cyan-100/60 dark:bg-cyan-900/40 border-cyan-200 dark:border-cyan-800/60',
  'thumb-l': 'bg-teal-100/60 dark:bg-teal-900/40 border-teal-200 dark:border-teal-800/60',
  'thumb-r': 'bg-teal-100/60 dark:bg-teal-900/40 border-teal-200 dark:border-teal-800/60',
  'index-r': 'bg-green-100/60 dark:bg-green-900/40 border-green-200 dark:border-green-800/60',
  'middle-r': 'bg-yellow-100/60 dark:bg-yellow-900/40 border-yellow-200 dark:border-yellow-800/60',
  'ring-r': 'bg-orange-100/60 dark:bg-orange-900/40 border-orange-200 dark:border-orange-800/60',
  'pinky-r': 'bg-red-100/60 dark:bg-red-900/40 border-red-200 dark:border-red-800/60',
  'default': 'bg-gray-100/60 dark:bg-gray-800/60 border-gray-200 dark:border-gray-700/60'
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
        const isLeftHand = key.finger.endsWith('-l');
        const shiftId = isLeftHand ? 'ShiftRight' : 'ShiftLeft';
        return { targetId: key.id, modifierIds: [shiftId] };
      }
      if (key.altGr === target) return { targetId: key.id, modifierIds: ['AltRight'] };
      
      const acuteAccents = { 'á': 'A', 'é': 'E', 'í': 'I', 'ó': 'O', 'ú': 'U' };
      const acuteAccentsUpper = { 'Á': 'A', 'É': 'E', 'Í': 'I', 'Ó': 'O', 'Ú': 'U' };
      const tildeAccents = { 'ã': 'A', 'õ': 'O' };
      const tildeAccentsUpper = { 'Ã': 'A', 'Õ': 'O' };
      const circumflexAccents = { 'â': 'A', 'ê': 'E', 'ô': 'O' };
      const circumflexAccentsUpper = { 'Â': 'A', 'Ê': 'E', 'Ô': 'O' };
      const graveAccents = { 'à': 'A' };
      const graveAccentsUpper = { 'À': 'A' };

      if (acuteAccents[target]) return { targetId: 'Acute', modifierIds: [] };
      if (acuteAccentsUpper[target]) return { targetId: 'Acute', modifierIds: ['ShiftLeft'] };
      if (tildeAccents[target]) return { targetId: 'Tilde', modifierIds: [] };
      if (tildeAccentsUpper[target]) return { targetId: 'Tilde', modifierIds: ['ShiftLeft'] };
      if (circumflexAccents[target]) return { targetId: 'Tilde', modifierIds: ['ShiftLeft'] };
      if (circumflexAccentsUpper[target]) return { targetId: 'Tilde', modifierIds: ['ShiftLeft'] };
      if (graveAccents[target]) return { targetId: 'Acute', modifierIds: ['ShiftLeft'] };
      if (graveAccentsUpper[target]) return { targetId: 'Acute', modifierIds: ['ShiftLeft'] };
    }
  }

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

  // Determine hand states based on targetId (if we had all images, we'd map them perfectly. For now, use resting hands or space)
  const isSpace = targetId === 'Space';
  const leftHandImg = isSpace ? '/assets/hands/space.png' : '/assets/hands/left-resting-hand.png';
  const rightHandImg = isSpace ? '/assets/hands/space.png' : '/assets/hands/right-resting-hand.png';

  return (
    <div className="w-max max-w-full mx-auto bg-white/50 dark:bg-black/40 p-2 rounded-xl border border-gray-200 dark:border-gray-800 backdrop-blur-md shadow-xl transform scale-[0.8] origin-bottom transition-transform duration-300 relative">
      <div 
        className="flex flex-col relative z-10"
        style={{ gap: `${GAP}px` }}
      >
        {ABNT2_LAYOUT.map((row, rowIndex) => (
          <div 
            key={rowIndex} 
            className="flex justify-center"
            style={{ gap: `${GAP}px` }}
          >
            {row.map((key, keyIdx) => {
              const isTarget = key.id === targetId;
              const isModifier = modifierIds.includes(key.id);
              const isActive = isTarget || isModifier;
              const fingerColorClass = FINGER_COLORS[key.finger] || FINGER_COLORS['default'];
              const isLetter = key.main === key.shift;
              
              // Handle ISO Enter visual trickery
              let enterStyles = {};
              let enterClasses = "rounded-md border-b-4";
              if (key.enterPiece === 'top') {
                enterStyles = { height: `calc(${getHeight(1)} + ${GAP}px + 4px)`, zIndex: 10 };
                enterClasses = "rounded-t-md rounded-br-md border-b-0";
              } else if (key.enterPiece === 'bottom') {
                enterClasses = "rounded-b-md rounded-tl-md border-t-0";
              }

              return (
                <div
                  key={`${key.id}-${keyIdx}`}
                  style={{ width: getWidth(key.u), ...(key.enterPiece === 'top' ? enterStyles : { height: getHeight(1) }) }}
                  className={`
                    relative flex flex-col items-center justify-center select-none transition-all duration-200
                    ${enterClasses}
                    ${isActive 
                      ? 'bg-green-400 border-green-600 dark:bg-green-500 dark:border-green-700 text-white shadow-[0_0_15px_rgba(74,222,128,0.7)] z-20' 
                      : `${fingerColorClass} text-gray-800 dark:text-gray-200`}
                    ${isActive && key.enterPiece !== 'top' && key.enterPiece !== 'bottom' ? 'transform -translate-y-0.5' : ''}
                  `}
                >
                  {/* Home row bump */}
                  {key.bump && (
                    <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-3 h-0.5 bg-current opacity-50 rounded-full" />
                  )}

                  {key.isSpecial ? (
                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">{key.main}</span>
                  ) : (
                    <div className="relative w-full h-full p-1">
                      {!isLetter && key.shift && (
                        <span className="absolute top-1 left-1.5 text-[11px] opacity-80 leading-none">{key.shift}</span>
                      )}
                      {!isLetter && key.altGr && (
                        <span className="absolute bottom-1 right-1.5 text-[10px] text-blue-700 dark:text-blue-300 opacity-90 leading-none font-semibold">{key.altGr}</span>
                      )}
                      
                      <span className={`
                        font-bold text-[14px] leading-none absolute
                        ${!isLetter && key.shift ? 'bottom-1 left-1.5' : 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'}
                      `}>
                        {key.main}
                      </span>
                    </div>
                  )}
                  
                  {/* Pseudo-element for Enter connection visual if active */}
                  {isActive && key.enterPiece === 'top' && (
                    <div className="absolute -bottom-[6px] right-0 w-full h-[6px] bg-green-400 dark:bg-green-500 z-30" />
                  )}
                  {!isActive && key.enterPiece === 'top' && (
                    <div className={`absolute -bottom-[6px] right-0 w-full h-[6px] ${fingerColorClass.split(' ')[0]} z-30`} />
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Hands Overlay */}
      <div className="absolute left-0 w-full pointer-events-none z-30 flex justify-between px-[2%]" style={{ bottom: '-35%', height: '140%' }}>
        {isSpace ? (
          <img src="/assets/hands/space.png" className="w-full h-full object-contain object-bottom opacity-70 drop-shadow-2xl transition-all duration-300" alt="Hands" />
        ) : (
          <>
            <img src={leftHandImg} className="h-full w-[48%] object-contain object-bottom opacity-70 drop-shadow-2xl transition-all duration-300" alt="Left hand" />
            <img src={rightHandImg} className="h-full w-[48%] object-contain object-bottom opacity-70 drop-shadow-2xl transition-all duration-300" alt="Right hand" />
          </>
        )}
      </div>
    </div>
  );
};

export default SimulatedKeyboard;
