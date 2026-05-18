import React, { useState, useEffect } from "react";
import { api } from "../../../../../lib/api";
import { Icon } from "../../../../../utils/general";

export const ExamResults = () => {
  const [submissions, setSubmissions] = useState([]);
  const [exams, setExams] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState("all");
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const examsData = await api.getExams();
      setExams(examsData.exams || []);
      // Precisamos de um endpoint para listar TODAS as submissões de todas as provas para o professor
      // Por enquanto, se tivermos selecionado uma prova, buscamos dela
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedExamId !== "all") {
      api.getExamSubmissions(selectedExamId).then(data => {
        setSubmissions(data.submissions || []);
      });
    }
  }, [selectedExamId]);

  if (selectedSubmission) {
    return (
      <div className="animate-fade-in">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => setSelectedSubmission(null)} className="p-2 hover:bg-gray-100 rounded-full transition">
            <Icon fafa="faArrowLeft" width={16} />
          </button>
          <div>
            <h2 className="text-2xl font-bold">Revisão: {selectedSubmission.displayName}</h2>
            <p className="text-gray-500 text-sm">Detalhamento das respostas e desempenho prático.</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border p-8 mb-8 shadow-sm">
           <div className="grid grid-cols-3 divide-x text-center mb-10">
              <div>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Nota Teoria</div>
                <div className="text-3xl font-black text-gray-800">{selectedSubmission.scoreMcq}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Nota Prática</div>
                <div className="text-3xl font-black text-gray-800">{selectedSubmission.scorePractical}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Final</div>
                <div className="text-5xl font-black text-blue-600">{selectedSubmission.totalScore}</div>
              </div>
           </div>

           <div className="p-10 border-2 border-dashed rounded-xl text-center">
              <div className="mb-4 flex justify-center opacity-20">
                <Icon src="exam" width={64} />
              </div>
              <h3 className="font-bold text-gray-400">Respostas Detalhadas</h3>
              <p className="text-sm text-gray-300">O log completo de respostas por questão estará disponível na versão 1.2.</p>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold">Resultados das Avaliações</h2>
          <p className="text-gray-500 text-sm">Monitore o desempenho dos alunos e revise submissões.</p>
        </div>
        <div className="flex items-center gap-2 bg-white border rounded-lg px-3 py-2 shadow-sm">
          <label className="text-xs font-bold text-gray-400 uppercase">Filtrar Prova:</label>
          <select 
            className="text-sm font-medium outline-none border-none bg-transparent"
            value={selectedExamId}
            onChange={e => setSelectedExamId(e.target.value)}
          >
            <option value="all">Selecione uma prova...</option>
            {exams.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-white border rounded-xl overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-4 font-bold text-sm">Aluno</th>
              <th className="p-4 font-bold text-sm">Status</th>
              <th className="p-4 font-bold text-sm text-center">Nota MCQ</th>
              <th className="p-4 font-bold text-sm text-center">Nota Prática</th>
              <th className="p-4 font-bold text-sm text-center">Total</th>
              <th className="p-4 font-bold text-sm text-right">Data</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {submissions.map(sub => (
              <tr key={sub.id} className="hover:bg-gray-50 transition cursor-pointer group" onClick={() => setSelectedSubmission(sub)}>
                <td className="p-4">
                  <div className="font-medium group-hover:text-blue-600 transition">{sub.displayName}</div>
                  <div className="text-xs text-gray-500">@{sub.username}</div>
                </td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                    sub.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {sub.status}
                  </span>
                </td>
                <td className="p-4 text-center font-medium">{sub.scoreMcq}</td>
                <td className="p-4 text-center font-medium">{sub.scorePractical}</td>
                <td className="p-4 text-center font-bold text-blue-600">{sub.totalScore}</td>
                <td className="p-4 text-right text-xs text-gray-400">
                  {sub.completedAt ? new Date(sub.completedAt).toLocaleString() : '---'}
                </td>
              </tr>
            ))}
            {submissions.length === 0 && (
              <tr>
                <td colSpan={6} className="p-10 text-center text-gray-400">
                  {selectedExamId === 'all' ? 'Selecione uma prova para ver os resultados.' : 'Nenhuma submissão encontrada para esta prova.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
