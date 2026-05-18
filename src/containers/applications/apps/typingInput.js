const DEAD_KEY_MARKS = {
  "~": "\u0303",
  "\u0303": "\u0303",
  "˜": "\u0303", // Small Tilde U+02DC
  "^": "\u0302",
  "\u0302": "\u0302",
  ˆ: "\u0302", // Modifier Letter Circumflex U+02C6
  "´": "\u0301",
  "\u0301": "\u0301",
  ˊ: "\u0301", // Modifier Letter Acute Accent U+02CA
  "`": "\u0300",
  "\u0300": "\u0300",
  ˋ: "\u0300", // Modifier Letter Grave Accent U+02CB
  "¨": "\u0308",
  "\u0308": "\u0308",
  "'": "\u0301", // US-Intl Acute
  '"': "\u0308", // US-Intl Umlaut
};

export const UNKNOWN_DEAD_KEY_MARK = "__dead_key__";

const DEAD_KEY_CODE_MARKS = {
  Backquote: { default: "`", shift: "~" },
  BracketLeft: { default: "´", shift: "`" },
  BracketRight: { default: "~", shift: "^" },
  Digit6: { default: "^", shift: "^" },
  Equal: { default: "´", shift: "`" },
  IntlBackslash: { default: "`", shift: "~" },
  Quote: { default: "´", shift: "¨" },
  Semicolon: { default: "´", shift: "¨" },
};

export const isDeadKeyMark = (char) =>
  Object.prototype.hasOwnProperty.call(DEAD_KEY_MARKS, char);

export const normalizeTypingCharacter = (char = "") =>
  String(char).normalize("NFC");

export const hasTypingDiacritic = (char = "") =>
  /[\u0300-\u036f]/.test(String(char).normalize("NFD"));

export const areTypingCharactersEquivalent = (
  typedChar = "",
  expectedChar = ""
) =>
  normalizeTypingCharacter(typedChar) ===
  normalizeTypingCharacter(expectedChar);

const composeWithKnownMark = (mark, char) => {
  const combined = `${char}${DEAD_KEY_MARKS[mark] || ""}`.normalize("NFC");
  return combined.length === 1 ? combined : "";
};

const findMarkForExpectedChar = (char, expectedChar) => {
  if (!expectedChar || char === expectedChar) return "";

  return (
    Object.keys(DEAD_KEY_MARKS).find(
      (mark) => composeWithKnownMark(mark, char) === expectedChar
    ) || ""
  );
};

const isExpectedLiteralDeadKeyMark = (char, expectedChar) =>
  isDeadKeyMark(char) && expectedChar === char;

export const composeDeadKeyMark = (
  mark,
  char,
  expectedChar = "",
  options = {}
) => {
  if (
    expectedChar &&
    areTypingCharactersEquivalent(char, expectedChar) &&
    hasTypingDiacritic(char)
  ) {
    return normalizeTypingCharacter(char);
  }

  if (isDeadKeyMark(mark)) {
    const combined = composeWithKnownMark(mark, char);
    if (
      options.allowExpectedFallback &&
      expectedChar &&
      combined &&
      !areTypingCharactersEquivalent(combined, expectedChar) &&
      hasTypingDiacritic(expectedChar)
    ) {
      const expectedMark = findMarkForExpectedChar(char, expectedChar);
      const expectedCombined = expectedMark
        ? composeWithKnownMark(expectedMark, char)
        : "";
      if (expectedCombined) return expectedCombined;
    }
    return combined || `${mark}${char}`;
  }

  const expectedMark = findMarkForExpectedChar(char, expectedChar);
  if (!expectedMark) return `${mark}${char}`;

  const combined = composeWithKnownMark(expectedMark, char);
  return combined || `${mark}${char}`;
};

export const resolveDeadKeyMarkFromEvent = (event) => {
  const source = event?.nativeEvent || event || {};
  const key = source.key || "";
  const data = source.data || "";

  if (isDeadKeyMark(data)) return data;
  if (isDeadKeyMark(key)) return key;

  if (key !== "Dead") return "";

  const mappedCode = DEAD_KEY_CODE_MARKS[source.code];
  if (!mappedCode) return UNKNOWN_DEAD_KEY_MARK;

  return source.shiftKey ? mappedCode.shift : mappedCode.default;
};

export const normalizeTypingInputValue = ({
  nextValue,
  previousValue,
  pendingMark = "",
  referenceText = "",
}) => {
  if (nextValue.length < previousValue.length) {
    return {
      value: nextValue,
      pendingMark: "",
      ignored: false,
    };
  }

  const addedChars = nextValue.slice(previousValue.length);
  if (!addedChars) {
    return {
      value: nextValue,
      pendingMark,
      ignored: false,
    };
  }

  let value = previousValue;
  let nextPendingMark = pendingMark;

  for (const char of addedChars) {
    if (nextPendingMark) {
      if (
        char === nextPendingMark &&
        isExpectedLiteralDeadKeyMark(char, referenceText[value.length])
      ) {
        value += char;
        nextPendingMark = "";
        continue;
      }
      if (char === nextPendingMark) continue;
      if (isDeadKeyMark(char)) {
        nextPendingMark = char;
        continue;
      }
      value += composeDeadKeyMark(
        nextPendingMark,
        char,
        referenceText[value.length]
      );
      nextPendingMark = "";
      continue;
    }

    if (isDeadKeyMark(char)) {
      if (isExpectedLiteralDeadKeyMark(char, referenceText[value.length])) {
        value += char;
        continue;
      }
      if (value.length > previousValue.length) {
        const baseChar = value.slice(-1);
        value = `${value.slice(0, -1)}${composeDeadKeyMark(
          char,
          baseChar,
          referenceText[value.length - 1]
        )}`;
        continue;
      }
      nextPendingMark = char;
      continue;
    }

    value += char;
  }

  return {
    value,
    pendingMark: nextPendingMark,
    ignored: value === previousValue && Boolean(nextPendingMark),
  };
};
