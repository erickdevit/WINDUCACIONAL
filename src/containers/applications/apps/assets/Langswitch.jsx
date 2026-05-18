import React from "react";
import i18next from "i18next";

function LangSwitch() {
  return (
    <div className="langSwitcher">
      <select
        value={i18next.language}
        onChange={(e) => i18next.changeLanguage(e.target.value)}
      >
        <option value="da">Dinamarquês</option>
        <option value="de">Alemão</option>
        <option value="en">Inglês</option>
        <option value="es">Espanhol</option>
        <option value="fr">Francês</option>
        <option value="hi">Hindi</option>
        <option value="hu">Húngaro</option>
        <option value="ja">Japonês</option>
        <option value="ko">Coreano</option>
        <option value="nl">Holandês</option>
        <option value="ru">Russo</option>
        <option value="tr">Turco</option>
        <option value="zh">Chinês</option>
        <option value="si">Cingalês</option>
      </select>
    </div>
  );
}

export default LangSwitch;
