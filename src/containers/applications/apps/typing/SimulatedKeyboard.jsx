import React, { useMemo } from 'react';
import './SimulatedKeyboard.css';
import { mapCharToKey, FINGER_COLORS } from './keyboardUtils';

const SimulatedKeyboard = ({ expectedKey }) => {
  const { targetId, modifierIds, targetFinger } = useMemo(() => mapCharToKey(expectedKey), [expectedKey]);

  // Determine hand states based on targetId (if we had all images, we'd map them perfectly. For now, use resting hands or space)
  const isSpace = targetId === 'Space';
  const leftHandImg = isSpace ? '/assets/hands/space.png' : '/assets/hands/left-resting-hand.png';
  const rightHandImg = isSpace ? '/assets/hands/space.png' : '/assets/hands/right-resting-hand.png';

  const activeIds = [targetId, ...modifierIds];

  const getFingerColorClass = (id) => {
    if (activeIds.includes(id)) {
       // if it's the target key, use targetFinger, else it's a modifier, maybe use its default finger?
       // For simplicity, just use targetFinger for all active. It's usually good enough.
       return FINGER_COLORS[targetFinger] || 'bg-green-400';
    }
    return '';
  };

  return (
    <div className="w-max max-w-full mx-auto bg-white/50 dark:bg-black/40 p-4 rounded-xl border border-gray-200 dark:border-gray-800 backdrop-blur-md shadow-xl transform scale-[0.85] origin-bottom transition-transform duration-300 relative kle-container">
      <div className="kle-inner relative z-10 mx-auto" style={{ width: '850px', height: '300px' }}>
<div id="keyboard">
<div id="keyboard-bg">
        

<div className="kr2">
<div className={`key ${activeIds.includes('Quote') ? 'active-key' : ''} ${getFingerColorClass('Quote')}`}><div className="kc"><div className="kb" style={{"left":"0px"}}></div><div className="kt" style={{"left":"6px"}}></div><div className="kls" style={{"left":"6px"}}><div className="kl kl0 ts5"><div>"</div></div><div className="kl kl6 ts5"><div title="' U+0027 APOSTROPHE
SHIFT: &quot; U+0022 QUOTATION MARK">'</div></div></div></div></div>
<div className={`key ${activeIds.includes('Digit1') ? 'active-key' : ''} ${getFingerColorClass('Digit1')}`}><div className="kc"><div className="kb" style={{"left":"54px"}}></div><div className="kt" style={{"left":"60px"}}></div><div className="kls" style={{"left":"60px"}}><div className="kl kl0 ts5"><div>!</div></div><div className="kl kl6 ts5"><div>1</div></div><div className="kl kl8 ts5"><div title="1 U+0031 DIGIT ONE
SHIFT: ! U+0021 EXCLAMATION MARK
CONTROL+MENU: ¹ U+00B9 SUPERSCRIPT ONE">¹</div></div></div></div></div>
<div className={`key ${activeIds.includes('Digit2') ? 'active-key' : ''} ${getFingerColorClass('Digit2')}`}><div className="kc"><div className="kb" style={{"left":"108px"}}></div><div className="kt" style={{"left":"114px"}}></div><div className="kls" style={{"left":"114px"}}><div className="kl kl0 ts5"><div>@</div></div><div className="kl kl6 ts5"><div>2</div></div><div className="kl kl8 ts5"><div title="2 U+0032 DIGIT TWO
SHIFT: @ U+0040 COMMERCIAL AT
SHIFT+CONTROL:  U+0000 &lt;control&gt;
CONTROL+MENU: ² U+00B2 SUPERSCRIPT TWO">²</div></div></div></div></div>
<div className={`key ${activeIds.includes('Digit3') ? 'active-key' : ''} ${getFingerColorClass('Digit3')}`}><div className="kc"><div className="kb" style={{"left":"162px"}}></div><div className="kt" style={{"left":"168px"}}></div><div className="kls" style={{"left":"168px"}}><div className="kl kl0 ts5"><div>#</div></div><div className="kl kl6 ts5"><div>3</div></div><div className="kl kl8 ts5"><div title="3 U+0033 DIGIT THREE
SHIFT: # U+0023 NUMBER SIGN
CONTROL+MENU: ³ U+00B3 SUPERSCRIPT THREE">³</div></div></div></div></div>
<div className={`key ${activeIds.includes('Digit4') ? 'active-key' : ''} ${getFingerColorClass('Digit4')}`}><div className="kc"><div className="kb" style={{"left":"216px"}}></div><div className="kt" style={{"left":"222px"}}></div><div className="kls" style={{"left":"222px"}}><div className="kl kl0 ts5"><div>$</div></div><div className="kl kl6 ts5"><div>4</div></div><div className="kl kl8 ts5"><div title="4 U+0034 DIGIT FOUR
SHIFT: $ U+0024 DOLLAR SIGN
CONTROL+MENU: £ U+00A3 POUND SIGN">£</div></div></div></div></div>
<div className={`key ${activeIds.includes('Digit5') ? 'active-key' : ''} ${getFingerColorClass('Digit5')}`}><div className="kc"><div className="kb" style={{"left":"270px"}}></div><div className="kt" style={{"left":"276px"}}></div><div className="kls" style={{"left":"276px"}}><div className="kl kl0 ts5"><div>%</div></div><div className="kl kl6 ts5"><div>5</div></div><div className="kl kl8 ts5"><div title="5 U+0035 DIGIT FIVE
SHIFT: % U+0025 PERCENT SIGN
CONTROL+MENU: ¢ U+00A2 CENT SIGN">¢</div></div></div></div></div>
<div className={`key ${activeIds.includes('Digit6') ? 'active-key' : ''} ${getFingerColorClass('Digit6')}`}><div className="kc"><div className="kb" style={{"left":"324px"}}></div><div className="kt" style={{"left":"330px"}}></div><div className="kls" style={{"left":"330px"}}><div className="kl kl0 ts5"><div><span className="dead">¨</span></div></div><div className="kl kl6 ts5"><div>6</div></div><div className="kl kl8 ts5"><div title="6 U+0036 DIGIT SIX
SHIFT: ¨ U+00A8 DIAERESIS
SHIFT+CONTROL:  U+001E &lt;control&gt;
CONTROL+MENU: ¬ U+00AC NOT SIGN">¬</div></div></div></div></div>
<div className={`key ${activeIds.includes('Digit7') ? 'active-key' : ''} ${getFingerColorClass('Digit7')}`}><div className="kc"><div className="kb" style={{"left":"378px"}}></div><div className="kt" style={{"left":"384px"}}></div><div className="kls" style={{"left":"384px"}}><div className="kl kl0 ts5"><div>&amp;</div></div><div className="kl kl6 ts5"><div title="7 U+0037 DIGIT SEVEN
SHIFT: &amp; U+0026 AMPERSAND">7</div></div></div></div></div>
<div className={`key ${activeIds.includes('Digit8') ? 'active-key' : ''} ${getFingerColorClass('Digit8')}`}><div className="kc"><div className="kb" style={{"left":"432px"}}></div><div className="kt" style={{"left":"438px"}}></div><div className="kls" style={{"left":"438px"}}><div className="kl kl0 ts5"><div>*</div></div><div className="kl kl6 ts5"><div title="8 U+0038 DIGIT EIGHT
SHIFT: * U+002A ASTERISK">8</div></div></div></div></div>
<div className={`key ${activeIds.includes('Digit9') ? 'active-key' : ''} ${getFingerColorClass('Digit9')}`}><div className="kc"><div className="kb" style={{"left":"486px"}}></div><div className="kt" style={{"left":"492px"}}></div><div className="kls" style={{"left":"492px"}}><div className="kl kl0 ts5"><div>(</div></div><div className="kl kl6 ts5"><div title="9 U+0039 DIGIT NINE
SHIFT: ( U+0028 LEFT PARENTHESIS">9</div></div></div></div></div>
<div className={`key ${activeIds.includes('Digit0') ? 'active-key' : ''} ${getFingerColorClass('Digit0')}`}><div className="kc"><div className="kb" style={{"left":"540px"}}></div><div className="kt" style={{"left":"546px"}}></div><div className="kls" style={{"left":"546px"}}><div className="kl kl0 ts5"><div>)</div></div><div className="kl kl6 ts5"><div title="0 U+0030 DIGIT ZERO
SHIFT: ) U+0029 RIGHT PARENTHESIS">0</div></div></div></div></div>
<div className={`key ${activeIds.includes('Minus') ? 'active-key' : ''} ${getFingerColorClass('Minus')}`}><div className="kc"><div className="kb" style={{"left":"594px"}}></div><div className="kt" style={{"left":"600px"}}></div><div className="kls" style={{"left":"600px"}}><div className="kl kl0 ts5"><div>_</div></div><div className="kl kl6 ts5"><div title="- U+002D HYPHEN-MINUS
SHIFT: _ U+005F LOW LINE
CONTROL:  U+001F &lt;control&gt;
SHIFT+CONTROL:  U+001F &lt;control&gt;">-</div></div></div></div></div>
<div className={`key ${activeIds.includes('Equal') ? 'active-key' : ''} ${getFingerColorClass('Equal')}`}><div className="kc"><div className="kb" style={{"left":"648px"}}></div><div className="kt" style={{"left":"654px"}}></div><div className="kls" style={{"left":"654px"}}><div className="kl kl0 ts5"><div>+</div></div><div className="kl kl6 ts5"><div>=</div></div><div className="kl kl8 ts5"><div title="= U+003D EQUALS SIGN
SHIFT: + U+002B PLUS SIGN
CONTROL+MENU: § U+00A7 SECTION SIGN">§</div></div></div></div></div>
<div className={`key ${activeIds.includes('Backspace') ? 'active-key' : ''} ${getFingerColorClass('Backspace')}`}><div className="kc"><div className="kb" style={{"left":"702px","width":"109px"}}></div><div className="kt" style={{"left":"708px","width":"97px"}}></div><div className="kls" style={{"left":"708px"}}><div className="kl kl0 ts5" style={{"width":"91px"}}><div style={{"width":"91px","maxWidth":"91px"}}>␈</div></div><div className="kl kl6 ts5" style={{"width":"91px"}}><div style={{"width":"91px","maxWidth":"91px"}} title=" U+0008 &lt;control&gt;
SHIFT:  U+0008 &lt;control&gt;
CONTROL:  U+007F &lt;control&gt;">␈</div></div></div></div></div>
</div>

<div className="kr3">
<div className={`key ${activeIds.includes('Tab') ? 'active-key' : ''} ${getFingerColorClass('Tab')}`}><div className="kc"><div className="kb" style={{"left":"0px","width":"81px"}}></div><div className="kt" style={{"left":"6px","width":"69px"}}></div><div className="kls" style={{"left":"6px"}}><div className="kl kl0 ts5" style={{"width":"63px"}}><div style={{"width":"63px","maxWidth":"63px"}}>␉</div></div><div className="kl kl6 ts5" style={{"width":"63px"}}><div style={{"width":"63px","maxWidth":"63px"}} title=" U+0009 &lt;control&gt;
SHIFT:  U+0009 &lt;control&gt;">␉</div></div></div></div></div>
<div className={`key ${activeIds.includes('KeyQ') ? 'active-key' : ''} ${getFingerColorClass('KeyQ')}`}><div className="kc"><div className="kb" style={{"left":"81px"}}></div><div className="kt" style={{"left":"87px"}}></div><div className="kls" style={{"left":"87px"}}><div className="kl kl0 ts5"><div>Q</div></div><div className="kl kl6 ts5"><div>q</div></div><div className="kl kl8 ts5"><div title="q U+0071 LATIN SMALL LETTER Q
SHIFT: Q U+0051 LATIN CAPITAL LETTER Q
CAPITAL: Q U+0051 LATIN CAPITAL LETTER Q
SHIFT+CAPITAL: q U+0071 LATIN SMALL LETTER Q
CONTROL+MENU: / U+002F SOLIDUS">/</div></div></div></div></div>
<div className={`key ${activeIds.includes('KeyW') ? 'active-key' : ''} ${getFingerColorClass('KeyW')}`}><div className="kc"><div className="kb" style={{"left":"135px"}}></div><div className="kt" style={{"left":"141px"}}></div><div className="kls" style={{"left":"141px"}}><div className="kl kl0 ts5"><div>W</div></div><div className="kl kl6 ts5"><div>w</div></div><div className="kl kl8 ts5"><div title="w U+0077 LATIN SMALL LETTER W
SHIFT: W U+0057 LATIN CAPITAL LETTER W
CAPITAL: W U+0057 LATIN CAPITAL LETTER W
SHIFT+CAPITAL: w U+0077 LATIN SMALL LETTER W
CONTROL+MENU: ? U+003F QUESTION MARK">?</div></div></div></div></div>
<div className={`key ${activeIds.includes('KeyE') ? 'active-key' : ''} ${getFingerColorClass('KeyE')}`}><div className="kc"><div className="kb" style={{"left":"189px"}}></div><div className="kt" style={{"left":"195px"}}></div><div className="kls" style={{"left":"195px"}}><div className="kl kl0 ts5"><div>E</div></div><div className="kl kl6 ts5"><div>e</div></div><div className="kl kl8 ts5"><div title="e U+0065 LATIN SMALL LETTER E
SHIFT: E U+0045 LATIN CAPITAL LETTER E
CAPITAL: E U+0045 LATIN CAPITAL LETTER E
SHIFT+CAPITAL: e U+0065 LATIN SMALL LETTER E
CONTROL+MENU: ° U+00B0 DEGREE SIGN">°</div></div></div></div></div>
<div className={`key ${activeIds.includes('KeyR') ? 'active-key' : ''} ${getFingerColorClass('KeyR')}`}><div className="kc"><div className="kb" style={{"left":"243px"}}></div><div className="kt" style={{"left":"249px"}}></div><div className="kls" style={{"left":"249px"}}><div className="kl kl0 ts5"><div>R</div></div><div className="kl kl6 ts5"><div title="r U+0072 LATIN SMALL LETTER R
SHIFT: R U+0052 LATIN CAPITAL LETTER R
CAPITAL: R U+0052 LATIN CAPITAL LETTER R
SHIFT+CAPITAL: r U+0072 LATIN SMALL LETTER R">r</div></div></div></div></div>
<div className={`key ${activeIds.includes('KeyT') ? 'active-key' : ''} ${getFingerColorClass('KeyT')}`}><div className="kc"><div className="kb" style={{"left":"297px"}}></div><div className="kt" style={{"left":"303px"}}></div><div className="kls" style={{"left":"303px"}}><div className="kl kl0 ts5"><div>T</div></div><div className="kl kl6 ts5"><div title="t U+0074 LATIN SMALL LETTER T
SHIFT: T U+0054 LATIN CAPITAL LETTER T
CAPITAL: T U+0054 LATIN CAPITAL LETTER T
SHIFT+CAPITAL: t U+0074 LATIN SMALL LETTER T">t</div></div></div></div></div>
<div className={`key ${activeIds.includes('KeyY') ? 'active-key' : ''} ${getFingerColorClass('KeyY')}`}><div className="kc"><div className="kb" style={{"left":"351px"}}></div><div className="kt" style={{"left":"357px"}}></div><div className="kls" style={{"left":"357px"}}><div className="kl kl0 ts5"><div>Y</div></div><div className="kl kl6 ts5"><div title="y U+0079 LATIN SMALL LETTER Y
SHIFT: Y U+0059 LATIN CAPITAL LETTER Y
CAPITAL: Y U+0059 LATIN CAPITAL LETTER Y
SHIFT+CAPITAL: y U+0079 LATIN SMALL LETTER Y">y</div></div></div></div></div>
<div className={`key ${activeIds.includes('KeyU') ? 'active-key' : ''} ${getFingerColorClass('KeyU')}`}><div className="kc"><div className="kb" style={{"left":"405px"}}></div><div className="kt" style={{"left":"411px"}}></div><div className="kls" style={{"left":"411px"}}><div className="kl kl0 ts5"><div>U</div></div><div className="kl kl6 ts5"><div title="u U+0075 LATIN SMALL LETTER U
SHIFT: U U+0055 LATIN CAPITAL LETTER U
CAPITAL: U U+0055 LATIN CAPITAL LETTER U
SHIFT+CAPITAL: u U+0075 LATIN SMALL LETTER U">u</div></div></div></div></div>
<div className={`key ${activeIds.includes('KeyI') ? 'active-key' : ''} ${getFingerColorClass('KeyI')}`}><div className="kc"><div className="kb" style={{"left":"459px"}}></div><div className="kt" style={{"left":"465px"}}></div><div className="kls" style={{"left":"465px"}}><div className="kl kl0 ts5"><div>I</div></div><div className="kl kl6 ts5"><div title="i U+0069 LATIN SMALL LETTER I
SHIFT: I U+0049 LATIN CAPITAL LETTER I
CAPITAL: I U+0049 LATIN CAPITAL LETTER I
SHIFT+CAPITAL: i U+0069 LATIN SMALL LETTER I">i</div></div></div></div></div>
<div className={`key ${activeIds.includes('KeyO') ? 'active-key' : ''} ${getFingerColorClass('KeyO')}`}><div className="kc"><div className="kb" style={{"left":"513px"}}></div><div className="kt" style={{"left":"519px"}}></div><div className="kls" style={{"left":"519px"}}><div className="kl kl0 ts5"><div>O</div></div><div className="kl kl6 ts5"><div title="o U+006F LATIN SMALL LETTER O
SHIFT: O U+004F LATIN CAPITAL LETTER O
CAPITAL: O U+004F LATIN CAPITAL LETTER O
SHIFT+CAPITAL: o U+006F LATIN SMALL LETTER O">o</div></div></div></div></div>
<div className={`key ${activeIds.includes('KeyP') ? 'active-key' : ''} ${getFingerColorClass('KeyP')}`}><div className="kc"><div className="kb" style={{"left":"567px"}}></div><div className="kt" style={{"left":"573px"}}></div><div className="kls" style={{"left":"573px"}}><div className="kl kl0 ts5"><div>P</div></div><div className="kl kl6 ts5"><div title="p U+0070 LATIN SMALL LETTER P
SHIFT: P U+0050 LATIN CAPITAL LETTER P
CAPITAL: P U+0050 LATIN CAPITAL LETTER P
SHIFT+CAPITAL: p U+0070 LATIN SMALL LETTER P">p</div></div></div></div></div>
<div className={`key ${activeIds.includes('Acute') ? 'active-key' : ''} ${getFingerColorClass('Acute')}`}><div className="kc"><div className="kb" style={{"left":"621px"}}></div><div className="kt" style={{"left":"627px"}}></div><div className="kls" style={{"left":"627px"}}><div className="kl kl0 ts5"><div><span className="dead">`</span></div></div><div className="kl kl6 ts5"><div title="´ U+00B4 ACUTE ACCENT
SHIFT: ` U+0060 GRAVE ACCENT"><span className="dead">´</span></div></div></div></div></div>
<div className={`key ${activeIds.includes('BracketLeft') ? 'active-key' : ''} ${getFingerColorClass('BracketLeft')}`}><div className="kc"><div className="kb" style={{"left":"675px"}}></div><div className="kt" style={{"left":"681px"}}></div><div className="kls" style={{"left":"681px"}}><div className="kl kl0 ts5"><div>{"{"}</div></div><div className="kl kl6 ts5"><div>[</div></div><div className="kl kl8 ts5"><div title="[ U+005B LEFT SQUARE BRACKET
SHIFT: { U+007B LEFT CURLY BRACKET
CONTROL:  U+001B &lt;control&gt;
CONTROL+MENU: ª U+00AA FEMININE ORDINAL INDICATOR">ª</div></div></div></div></div>
<div className={`key ${activeIds.includes('Enter') ? 'active-key' : ''} ${getFingerColorClass('Enter')}`}><div className="kc"><div className="kb" style={{"left":"743px","width":"68px","height":"108px"}}></div>
								 <div className="kb" style={{"left":"729px","top":"54px","width":"81px","height":"54px"}}></div> 
									<div className="kb" style={{"borderRadius":"5px","left":"744px","top":"55px","width":"66px","height":"106px","backgroundColor":"rgb(204, 204, 204)","borderStyle":"none"}}></div>
										<div className="kt" style={{"left":"749px","top":"57px","width":"56px","height":"96px"}}></div>
										<div className="kt" style={{"backgroundPosition":"0px 0px","borderStyle":"none !important","left":"735px","top":"57px","width":"69px","height":"42px","backgroundSize":"69px 96px"}}></div>
										<div className="kt" style={{"backgroundPosition":"-13px 0px","borderStyle":"none !important","left":"750px","top":"59px","width":"54px","height":"94px","backgroundSize":"69px 96px"}}></div>    
											<div className="kls" style={{"left":"749px","top":"57px","width":"56px","height":"96px"}}><div className="kl kl0 ts5" style={{"width":"50px","height":"90px"}}><div style={{"width":"50px","maxWidth":"50px","height":"90px"}}>␍</div></div><div className="kl kl6 ts5" style={{"width":"50px","height":"90px"}}><div style={{"width":"50px","maxWidth":"50px","height":"90px"}} title=" U+000D &lt;control&gt;
SHIFT:  U+000D &lt;control&gt;
CONTROL:  U+000A &lt;control&gt;">␍</div></div></div></div>
</div>
</div>

<div className="kr4">
<div className={`key ${activeIds.includes('CapsLock') ? 'active-key' : ''} ${getFingerColorClass('CapsLock')}`}><div className="kc"><div className="kb" style={{"left":"0px","width":"95px"}}></div><div className="kt" style={{"left":"6px","width":"83px"}}></div><div className="kls" style={{"left":"6px","width":"83px"}}><div className="kl kl4 ts4" style={{"width":"77px"}}><div style={{"width":"77px","maxWidth":"77px"}}>Caps Lock</div></div></div></div></div>
<div className={`key ${activeIds.includes('KeyA') ? 'active-key' : ''} ${getFingerColorClass('KeyA')}`}><div className="kc"><div className="kb" style={{"left":"95px"}}></div><div className="kt" style={{"left":"101px"}}></div><div className="kls" style={{"left":"101px"}}><div className="kl kl0 ts5"><div>A</div></div><div className="kl kl6 ts5"><div title="a U+0061 LATIN SMALL LETTER A
SHIFT: A U+0041 LATIN CAPITAL LETTER A
CAPITAL: A U+0041 LATIN CAPITAL LETTER A
SHIFT+CAPITAL: a U+0061 LATIN SMALL LETTER A">a</div></div></div></div></div>
<div className={`key ${activeIds.includes('KeyS') ? 'active-key' : ''} ${getFingerColorClass('KeyS')}`}><div className="kc"><div className="kb" style={{"left":"149px"}}></div><div className="kt" style={{"left":"155px"}}></div><div className="kls" style={{"left":"155px"}}><div className="kl kl0 ts5"><div>S</div></div><div className="kl kl6 ts5"><div title="s U+0073 LATIN SMALL LETTER S
SHIFT: S U+0053 LATIN CAPITAL LETTER S
CAPITAL: S U+0053 LATIN CAPITAL LETTER S
SHIFT+CAPITAL: s U+0073 LATIN SMALL LETTER S">s</div></div></div></div></div>
<div className={`key ${activeIds.includes('KeyD') ? 'active-key' : ''} ${getFingerColorClass('KeyD')}`}><div className="kc"><div className="kb" style={{"left":"203px"}}></div><div className="kt" style={{"left":"209px"}}></div><div className="kls" style={{"left":"209px"}}><div className="kl kl0 ts5"><div>D</div></div><div className="kl kl6 ts5"><div title="d U+0064 LATIN SMALL LETTER D
SHIFT: D U+0044 LATIN CAPITAL LETTER D
CAPITAL: D U+0044 LATIN CAPITAL LETTER D
SHIFT+CAPITAL: d U+0064 LATIN SMALL LETTER D">d</div></div></div></div></div>
<div className={`key ${activeIds.includes('KeyF') ? 'active-key' : ''} ${getFingerColorClass('KeyF')}`}><div className="kc"><div className="kb" style={{"left":"257px"}}></div><div className="kt" style={{"left":"263px"}}></div><div className="kls" style={{"left":"263px"}}><div className="kl kl0 ts5"><div>F</div></div><div className="kl kl6 ts5"><div title="f U+0066 LATIN SMALL LETTER F
SHIFT: F U+0046 LATIN CAPITAL LETTER F
CAPITAL: F U+0046 LATIN CAPITAL LETTER F
SHIFT+CAPITAL: f U+0066 LATIN SMALL LETTER F">f</div></div></div></div></div>
<div className={`key ${activeIds.includes('KeyG') ? 'active-key' : ''} ${getFingerColorClass('KeyG')}`}><div className="kc"><div className="kb" style={{"left":"311px"}}></div><div className="kt" style={{"left":"317px"}}></div><div className="kls" style={{"left":"317px"}}><div className="kl kl0 ts5"><div>G</div></div><div className="kl kl6 ts5"><div title="g U+0067 LATIN SMALL LETTER G
SHIFT: G U+0047 LATIN CAPITAL LETTER G
CAPITAL: G U+0047 LATIN CAPITAL LETTER G
SHIFT+CAPITAL: g U+0067 LATIN SMALL LETTER G">g</div></div></div></div></div>
<div className={`key ${activeIds.includes('KeyH') ? 'active-key' : ''} ${getFingerColorClass('KeyH')}`}><div className="kc"><div className="kb" style={{"left":"365px"}}></div><div className="kt" style={{"left":"371px"}}></div><div className="kls" style={{"left":"371px"}}><div className="kl kl0 ts5"><div>H</div></div><div className="kl kl6 ts5"><div title="h U+0068 LATIN SMALL LETTER H
SHIFT: H U+0048 LATIN CAPITAL LETTER H
CAPITAL: H U+0048 LATIN CAPITAL LETTER H
SHIFT+CAPITAL: h U+0068 LATIN SMALL LETTER H">h</div></div></div></div></div>
<div className={`key ${activeIds.includes('KeyJ') ? 'active-key' : ''} ${getFingerColorClass('KeyJ')}`}><div className="kc"><div className="kb" style={{"left":"419px"}}></div><div className="kt" style={{"left":"425px"}}></div><div className="kls" style={{"left":"425px"}}><div className="kl kl0 ts5"><div>J</div></div><div className="kl kl6 ts5"><div title="j U+006A LATIN SMALL LETTER J
SHIFT: J U+004A LATIN CAPITAL LETTER J
CAPITAL: J U+004A LATIN CAPITAL LETTER J
SHIFT+CAPITAL: j U+006A LATIN SMALL LETTER J">j</div></div></div></div></div>
<div className={`key ${activeIds.includes('KeyK') ? 'active-key' : ''} ${getFingerColorClass('KeyK')}`}><div className="kc"><div className="kb" style={{"left":"473px"}}></div><div className="kt" style={{"left":"479px"}}></div><div className="kls" style={{"left":"479px"}}><div className="kl kl0 ts5"><div>K</div></div><div className="kl kl6 ts5"><div title="k U+006B LATIN SMALL LETTER K
SHIFT: K U+004B LATIN CAPITAL LETTER K
CAPITAL: K U+004B LATIN CAPITAL LETTER K
SHIFT+CAPITAL: k U+006B LATIN SMALL LETTER K">k</div></div></div></div></div>
<div className={`key ${activeIds.includes('KeyL') ? 'active-key' : ''} ${getFingerColorClass('KeyL')}`}><div className="kc"><div className="kb" style={{"left":"527px"}}></div><div className="kt" style={{"left":"533px"}}></div><div className="kls" style={{"left":"533px"}}><div className="kl kl0 ts5"><div>L</div></div><div className="kl kl6 ts5"><div title="l U+006C LATIN SMALL LETTER L
SHIFT: L U+004C LATIN CAPITAL LETTER L
CAPITAL: L U+004C LATIN CAPITAL LETTER L
SHIFT+CAPITAL: l U+006C LATIN SMALL LETTER L">l</div></div></div></div></div>
<div className={`key ${activeIds.includes('KeyCCedilla') ? 'active-key' : ''} ${getFingerColorClass('KeyCCedilla')}`}><div className="kc"><div className="kb" style={{"left":"581px"}}></div><div className="kt" style={{"left":"587px"}}></div><div className="kls" style={{"left":"587px"}}><div className="kl kl0 ts5"><div>Ç</div></div><div className="kl kl6 ts5"><div title="ç U+00E7 LATIN SMALL LETTER C WITH CEDILLA
SHIFT: Ç U+00C7 LATIN CAPITAL LETTER C WITH CEDILLA
CONTROL:  U+001D &lt;control&gt;
CAPITAL: Ç U+00C7 LATIN CAPITAL LETTER C WITH CEDILLA
SHIFT+CAPITAL: ç U+00E7 LATIN SMALL LETTER C WITH CEDILLA">ç</div></div></div></div></div>
<div className={`key ${activeIds.includes('Tilde') ? 'active-key' : ''} ${getFingerColorClass('Tilde')}`}><div className="kc"><div className="kb" style={{"left":"635px"}}></div><div className="kt" style={{"left":"641px"}}></div><div className="kls" style={{"left":"641px"}}><div className="kl kl0 ts5"><div><span className="dead">^</span></div></div><div className="kl kl6 ts5"><div title="~ U+007E TILDE
SHIFT: ^ U+005E CIRCUMFLEX ACCENT"><span className="dead">~</span></div></div></div></div></div>
<div className={`key ${activeIds.includes('BracketRight') ? 'active-key' : ''} ${getFingerColorClass('BracketRight')}`}><div className="kc"><div className="kb" style={{"left":"689px"}}></div><div className="kt" style={{"left":"695px"}}></div><div className="kls" style={{"left":"695px"}}><div className="kl kl0 ts5"><div>{"}"}</div></div><div className="kl kl6 ts5"><div>]</div></div><div className="kl kl8 ts5"><div title="] U+005D RIGHT SQUARE BRACKET
SHIFT: } U+007D RIGHT CURLY BRACKET
CONTROL:  U+001C &lt;control&gt;
CONTROL+MENU: º U+00BA MASCULINE ORDINAL INDICATOR">º</div></div></div></div></div>
</div>

<div className="kr5">
<div className={`key ${activeIds.includes('ShiftLeft') ? 'active-key' : ''} ${getFingerColorClass('ShiftLeft')}`}><div className="kc"><div className="kb" style={{"left":"0px","width":"68px"}}></div><div className="kt" style={{"left":"6px","width":"56px"}}></div><div className="kls" style={{"left":"6px","width":"56px"}}><div className="kl kl4 ts4" style={{"width":"50px"}}><div style={{"width":"50px","maxWidth":"50px"}}>Shift</div></div></div></div></div>
<div className={`key ${activeIds.includes('Backslash') ? 'active-key' : ''} ${getFingerColorClass('Backslash')}`}><div className="kc"><div className="kb" style={{"left":"68px"}}></div><div className="kt" style={{"left":"74px"}}></div><div className="kls" style={{"left":"74px"}}><div className="kl kl0 ts5"><div>|</div></div><div className="kl kl6 ts5"><div title="\ U+005C REVERSE SOLIDUS
SHIFT: | U+007C VERTICAL LINE
CONTROL:  U+001C &lt;control&gt;">\</div></div></div></div></div>
<div className={`key ${activeIds.includes('KeyZ') ? 'active-key' : ''} ${getFingerColorClass('KeyZ')}`}><div className="kc"><div className="kb" style={{"left":"122px"}}></div><div className="kt" style={{"left":"128px"}}></div><div className="kls" style={{"left":"128px"}}><div className="kl kl0 ts5"><div>Z</div></div><div className="kl kl6 ts5"><div title="z U+007A LATIN SMALL LETTER Z
SHIFT: Z U+005A LATIN CAPITAL LETTER Z
CAPITAL: Z U+005A LATIN CAPITAL LETTER Z
SHIFT+CAPITAL: z U+007A LATIN SMALL LETTER Z">z</div></div></div></div></div>
<div className={`key ${activeIds.includes('KeyX') ? 'active-key' : ''} ${getFingerColorClass('KeyX')}`}><div className="kc"><div className="kb" style={{"left":"176px"}}></div><div className="kt" style={{"left":"182px"}}></div><div className="kls" style={{"left":"182px"}}><div className="kl kl0 ts5"><div>X</div></div><div className="kl kl6 ts5"><div title="x U+0078 LATIN SMALL LETTER X
SHIFT: X U+0058 LATIN CAPITAL LETTER X
CAPITAL: X U+0058 LATIN CAPITAL LETTER X
SHIFT+CAPITAL: x U+0078 LATIN SMALL LETTER X">x</div></div></div></div></div>
<div className={`key ${activeIds.includes('KeyC') ? 'active-key' : ''} ${getFingerColorClass('KeyC')}`}><div className="kc"><div className="kb" style={{"left":"230px"}}></div><div className="kt" style={{"left":"236px"}}></div><div className="kls" style={{"left":"236px"}}><div className="kl kl0 ts5"><div>C</div></div><div className="kl kl6 ts5"><div>c</div></div><div className="kl kl8 ts5"><div title="c U+0063 LATIN SMALL LETTER C
SHIFT: C U+0043 LATIN CAPITAL LETTER C
CAPITAL: C U+0043 LATIN CAPITAL LETTER C
SHIFT+CAPITAL: c U+0063 LATIN SMALL LETTER C
CONTROL+MENU: ₢ U+20A2 CRUZEIRO SIGN">₢</div></div></div></div></div>
<div className={`key ${activeIds.includes('KeyV') ? 'active-key' : ''} ${getFingerColorClass('KeyV')}`}><div className="kc"><div className="kb" style={{"left":"284px"}}></div><div className="kt" style={{"left":"290px"}}></div><div className="kls" style={{"left":"290px"}}><div className="kl kl0 ts5"><div>V</div></div><div className="kl kl6 ts5"><div title="v U+0076 LATIN SMALL LETTER V
SHIFT: V U+0056 LATIN CAPITAL LETTER V
CAPITAL: V U+0056 LATIN CAPITAL LETTER V
SHIFT+CAPITAL: v U+0076 LATIN SMALL LETTER V">v</div></div></div></div></div>
<div className={`key ${activeIds.includes('KeyB') ? 'active-key' : ''} ${getFingerColorClass('KeyB')}`}><div className="kc"><div className="kb" style={{"left":"338px"}}></div><div className="kt" style={{"left":"344px"}}></div><div className="kls" style={{"left":"344px"}}><div className="kl kl0 ts5"><div>B</div></div><div className="kl kl6 ts5"><div title="b U+0062 LATIN SMALL LETTER B
SHIFT: B U+0042 LATIN CAPITAL LETTER B
CAPITAL: B U+0042 LATIN CAPITAL LETTER B
SHIFT+CAPITAL: b U+0062 LATIN SMALL LETTER B">b</div></div></div></div></div>
<div className={`key ${activeIds.includes('KeyN') ? 'active-key' : ''} ${getFingerColorClass('KeyN')}`}><div className="kc"><div className="kb" style={{"left":"392px"}}></div><div className="kt" style={{"left":"398px"}}></div><div className="kls" style={{"left":"398px"}}><div className="kl kl0 ts5"><div>N</div></div><div className="kl kl6 ts5"><div title="n U+006E LATIN SMALL LETTER N
SHIFT: N U+004E LATIN CAPITAL LETTER N
CAPITAL: N U+004E LATIN CAPITAL LETTER N
SHIFT+CAPITAL: n U+006E LATIN SMALL LETTER N">n</div></div></div></div></div>
<div className={`key ${activeIds.includes('KeyM') ? 'active-key' : ''} ${getFingerColorClass('KeyM')}`}><div className="kc"><div className="kb" style={{"left":"446px"}}></div><div className="kt" style={{"left":"452px"}}></div><div className="kls" style={{"left":"452px"}}><div className="kl kl0 ts5"><div>M</div></div><div className="kl kl6 ts5"><div title="m U+006D LATIN SMALL LETTER M
SHIFT: M U+004D LATIN CAPITAL LETTER M
CAPITAL: M U+004D LATIN CAPITAL LETTER M
SHIFT+CAPITAL: m U+006D LATIN SMALL LETTER M">m</div></div></div></div></div>
<div className={`key ${activeIds.includes('Comma') ? 'active-key' : ''} ${getFingerColorClass('Comma')}`}><div className="kc"><div className="kb" style={{"left":"500px"}}></div><div className="kt" style={{"left":"506px"}}></div><div className="kls" style={{"left":"506px"}}><div className="kl kl0 ts5"><div>&lt;</div></div><div className="kl kl6 ts5"><div title=", U+002C COMMA
SHIFT: &lt; U+003C LESS-THAN SIGN">,</div></div></div></div></div>
<div className={`key ${activeIds.includes('Period') ? 'active-key' : ''} ${getFingerColorClass('Period')}`}><div className="kc"><div className="kb" style={{"left":"554px"}}></div><div className="kt" style={{"left":"560px"}}></div><div className="kls" style={{"left":"560px"}}><div className="kl kl0 ts5"><div>&gt;</div></div><div className="kl kl6 ts5"><div title=". U+002E FULL STOP
SHIFT: &gt; U+003E GREATER-THAN SIGN">.</div></div></div></div></div>
<div className={`key ${activeIds.includes('Semicolon') ? 'active-key' : ''} ${getFingerColorClass('Semicolon')}`}><div className="kc"><div className="kb" style={{"left":"608px"}}></div><div className="kt" style={{"left":"614px"}}></div><div className="kls" style={{"left":"614px"}}><div className="kl kl0 ts5"><div>:</div></div><div className="kl kl6 ts5"><div title="; U+003B SEMICOLON
SHIFT: : U+003A COLON">;</div></div></div></div></div>
<div className={`key ${activeIds.includes('Slash') ? 'active-key' : ''} ${getFingerColorClass('Slash')}`}><div className="kc"><div className="kb" style={{"left":"662px","width":"149px"}}></div><div className="kt" style={{"left":"668px","width":"137px"}}></div><div className="kls" style={{"left":"668px","width":"137px"}}><div className="kl kl4 ts4" style={{"width":"131px"}}><div style={{"width":"131px","maxWidth":"131px"}}>Shift</div></div></div></div></div>
</div>

<div className="kr6">
<div className={`key ${activeIds.includes('ShiftRight') ? 'active-key' : ''} ${getFingerColorClass('ShiftRight')}`}><div className="kc"><div className="kb" style={{"left":"0px","width":"68px"}}></div><div className="kt" style={{"left":"6px","width":"56px"}}></div><div className="kls" style={{"left":"6px","width":"56px"}}><div className="kl kl4 ts4" style={{"width":"50px"}}><div style={{"width":"50px","maxWidth":"50px"}}>Ctrl</div></div></div></div></div>
<div className={`key ${activeIds.includes('ControlLeft') ? 'active-key' : ''} ${getFingerColorClass('ControlLeft')}`}><div className="kc"><div className="kb" style={{"left":"68px","width":"68px"}}></div><div className="kt" style={{"left":"74px","width":"56px"}}></div><div className="kls" style={{"left":"74px","width":"56px"}}><div className="kl kl4 ts4" style={{"width":"50px"}}><div style={{"width":"50px","maxWidth":"50px"}}>Win</div></div></div></div></div>
<div className={`key ${activeIds.includes('MetaLeft') ? 'active-key' : ''} ${getFingerColorClass('MetaLeft')}`}><div className="kc"><div className="kb" style={{"left":"135px","width":"68px"}}></div><div className="kt" style={{"left":"141px","width":"56px"}}></div><div className="kls" style={{"left":"141px","width":"56px"}}><div className="kl kl4 ts4" style={{"width":"50px"}}><div style={{"width":"50px","maxWidth":"50px"}}>Alt</div></div></div></div></div>
<div className={`key ${activeIds.includes('AltLeft') ? 'active-key' : ''} ${getFingerColorClass('AltLeft')}`}><div className="kc"><div className="kb" style={{"left":"203px","width":"338px"}}></div><div className="kt" style={{"left":"209px","width":"326px"}}></div><div className="kls" style={{"left":"209px","width":"326px"}}><div className="kl kl0 ts5" style={{"width":"320px"}}><div style={{"width":"320px","maxWidth":"320px"}}>␠</div></div><div className="kl kl6 ts5" style={{"width":"320px"}}><div style={{"width":"320px","maxWidth":"320px"}} title="  U+0020 SPACE
SHIFT:   U+0020 SPACE
CONTROL:   U+0020 SPACE">␠</div></div></div></div></div>
<div className={`key ${activeIds.includes('Space') ? 'active-key' : ''} ${getFingerColorClass('Space')}`}><div className="kc"><div className="kb" style={{"left":"540px","width":"68px"}}></div><div className="kt" style={{"left":"546px","width":"56px"}}></div><div className="kls" style={{"left":"546px","width":"56px"}}><div className="kl kl4 ts4" style={{"width":"50px"}}><div style={{"width":"50px","maxWidth":"50px"}}>AltGr</div></div></div></div></div>
<div className={`key ${activeIds.includes('AltRight') ? 'active-key' : ''} ${getFingerColorClass('AltRight')}`}><div className="kc"><div className="kb" style={{"left":"608px","width":"68px"}}></div><div className="kt" style={{"left":"614px","width":"56px"}}></div><div className="kls" style={{"left":"614px","width":"56px"}}><div className="kl kl4 ts4" style={{"width":"50px"}}><div style={{"width":"50px","maxWidth":"50px"}}>Win</div></div></div></div></div>
<div className={`key ${activeIds.includes('MetaRight') ? 'active-key' : ''} ${getFingerColorClass('MetaRight')}`}><div className="kc"><div className="kb" style={{"left":"675px","width":"68px"}}></div><div className="kt" style={{"left":"681px","width":"56px"}}></div><div className="kls" style={{"left":"681px","width":"56px"}}><div className="kl kl4 ts4" style={{"width":"50px"}}><div style={{"width":"50px","maxWidth":"50px"}}>Menu</div></div></div></div></div>
<div className={`key ${activeIds.includes('ContextMenu') ? 'active-key' : ''} ${getFingerColorClass('ContextMenu')}`}><div className="kc"><div className="kb" style={{"left":"743px","width":"68px"}}></div><div className="kt" style={{"left":"749px","width":"56px"}}></div><div className="kls" style={{"left":"749px","width":"56px"}}><div className="kl kl4 ts4" style={{"width":"50px"}}><div style={{"width":"50px","maxWidth":"50px"}}>Ctrl</div></div></div></div></div>
</div>

</div> 
</div>

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
