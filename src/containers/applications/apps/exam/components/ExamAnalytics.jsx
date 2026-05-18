import React, { useState, useEffect } from "react";
import { api } from "../../../../../lib/api";
import { Icon } from "../../../../../utils/general";

export const ExamAnalytics = () => {
  const [stats, setStats] = useState({
    totalSubmissions: 0,
    averageScore: 0,
    completionRate: 0,
    byTurma: []
  });
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await api.getExamAnalytics();
      setStats(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) return <div className="p-20 text-center">Calculando métricas...</div>;

  return (
    <div className="animate-fade-in">
      <h2 className="text-2xl font-bold mb-8">Gráficos Analíticos</h2>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <div className="text-xs font-bold text-gray-400 uppercase mb-2">Total de Provas Feitas</div>
          <div className="text-3xl font-black text-blue-600">{stats.totalSubmissions}</div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <div className="text-xs font-bold text-gray-400 uppercase mb-2">Média de Notas</div>
          <div className="text-3xl font-black text-green-600">{stats.averageScore}</div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <div className="text-xs font-bold text-gray-400 uppercase mb-2">Taxa de Conclusão</div>
          <div className="text-3xl font-black text-purple-600">{stats.completionRate}%</div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <div className="text-xs font-bold text-gray-400 uppercase mb-2">Turmas Avaliadas</div>
          <div className="text-3xl font-black text-orange-600">{stats.byTurma.length}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-2xl border shadow-sm">
          <h3 className="font-bold mb-8 flex items-center gap-2">
            <Icon fafa="faChartBar" width={16} /> Média por Turma
          </h3>
          <div className="space-y-6">
            {stats.byTurma.map((t, i) => (
              <div key={i}>
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium text-gray-700">{t.name}</span>
                  <span className="font-bold text-blue-600">{t.avg} / 10</span>
                </div>
                <div className="w-full bg-gray-100 h-4 rounded-full overflow-hidden">
                  <div 
                    className="bg-blue-500 h-full rounded-full transition-all duration-1000" 
                    style={{ width: `${t.avg * 10}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-8 rounded-2xl border shadow-sm">
          <h3 className="font-bold mb-8 flex items-center gap-2">
            <Icon fafa="faUsers" width={16} /> Volume de Alunos por Turma
          </h3>
          <div className="flex items-end justify-around h-48 pt-4">
             {stats.byTurma.map((t, i) => (
              <div key={i} className="flex flex-col items-center gap-2 w-16">
                <div 
                  className="w-full bg-blue-100 border-t-4 border-blue-500 rounded-t transition-all duration-1000" 
                  style={{ height: `${(t.count / 20) * 100}%` }}
                >
                  <div className="text-[10px] font-bold text-blue-700 text-center mt-1">{t.count}</div>
                </div>
                <span className="text-[10px] font-bold text-gray-400 uppercase truncate w-full text-center">{t.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
