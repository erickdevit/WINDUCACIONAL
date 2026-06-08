import React, { useState, useEffect } from "react";
import { api } from "../../../../../lib/api";

export const TurmaSelector = ({ value, onChange }) => {
  const [turmas, setTurmas] = useState([]);

  useEffect(() => {
    api
      .getTurmas()
      .then((data) => {
        setTurmas(data.turmas || []);
      })
      .catch(console.error);
  }, []);

  return (
    <select
      className="turma-select"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">Todas as turmas</option>
      {turmas.map((t) => (
        <option key={t.id} value={t.id}>
          {t.nome} ({t.code})
        </option>
      ))}
    </select>
  );
};
