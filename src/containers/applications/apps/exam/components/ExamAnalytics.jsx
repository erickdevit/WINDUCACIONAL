import React, { useState, useEffect, useMemo } from "react";
import { api } from "../../../../../lib/api";
import { Icon } from "../../../../../utils/general";
import { TurmaSelector } from "./TurmaSelector";

export const ExamAnalytics = () => {
  const [stats, setStats] = useState({
    totalSubmissions: 0,
    averageScore: 0,
    completionRate: 0,
    byTurma: [],
  });
  const [selectedTurmaId, setSelectedTurmaId] = useState("");
  const [loading, setLoading] = useState(true);

  const loadData = async (turmaId) => {
    setLoading(true);
    try {
      const data = await api.getExamAnalytics(turmaId || undefined);
      setStats(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(selectedTurmaId);
  }, [selectedTurmaId]);

  const maxAvg = useMemo(() => {
    if (stats.byTurma.length === 0) return 10;
    return Math.max(...stats.byTurma.map((t) => parseFloat(t.avg) || 0), 1);
  }, [stats.byTurma]);

  const maxCount = useMemo(() => {
    if (stats.byTurma.length === 0) return 1;
    return Math.max(...stats.byTurma.map((t) => parseInt(t.count) || 0), 1);
  }, [stats.byTurma]);

  return (
    <div className="animate-fade-in">
      <div className="exam-section-head">
        <h2>Análise</h2>
        <TurmaSelector value={selectedTurmaId} onChange={setSelectedTurmaId} />
      </div>

      {loading ? (
        <div className="exam-loader">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
          <p>Calculando...</p>
        </div>
      ) : (
        <>
          <div className="exam-stat-grid four">
            <div className="stat-card">
              <span className="stat-label">Provas feitas</span>
              <span className="stat-value">{stats.totalSubmissions}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Média</span>
              <span className="stat-value">{stats.averageScore}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Conclusão</span>
              <span className="stat-value">{stats.completionRate}%</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Turmas</span>
              <span className="stat-value">{stats.byTurma.length}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="exam-panel" style={{ padding: 20 }}>
              <h3 className="exam-card-title">
                <Icon fafa="faChartBar" width={15} /> Média por turma
              </h3>
              <div className="space-y-5">
                {stats.byTurma.map((t, i) => {
                  const avg = parseFloat(t.avg) || 0;
                  const pct = maxAvg > 0 ? (avg / maxAvg) * 100 : 0;
                  return (
                    <div key={i}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium">{t.name}</span>
                        <span
                          className="font-bold"
                          style={{ color: "var(--accent)" }}
                        >
                          {t.avg} pts
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden">
                        <div
                          className="bg-blue-500 h-full rounded-full transition-all duration-700"
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
                {stats.byTurma.length === 0 && (
                  <div className="exam-empty compact">
                    Sem dados de avaliação.
                  </div>
                )}
              </div>
            </div>

            <div className="exam-panel" style={{ padding: 20 }}>
              <h3 className="exam-card-title">
                <Icon fafa="faUsers" width={15} /> Volume por turma
              </h3>
              <div
                className="flex items-end justify-around"
                style={{ height: 180, paddingTop: 16 }}
              >
                {stats.byTurma.map((t, i) => {
                  const count = parseInt(t.count) || 0;
                  const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
                  return (
                    <div
                      key={i}
                      className="flex flex-col items-center gap-2"
                      style={{ width: 48 }}
                    >
                      <div
                        className="w-full bg-blue-100 border-t-4 border-blue-500 rounded-t transition-all duration-700"
                        style={{ height: `${Math.max(pct, 8)}%` }}
                      >
                        <div className="text-[10px] font-bold text-blue-700 text-center mt-1">
                          {count}
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase truncate w-full text-center">
                        {t.name}
                      </span>
                    </div>
                  );
                })}
                {stats.byTurma.length === 0 && (
                  <div className="exam-empty compact" style={{ width: "100%" }}>
                    Sem dados.
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
