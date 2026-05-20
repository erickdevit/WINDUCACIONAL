import React, { useState, useEffect } from "react";
import { api } from "../../../../../lib/api";
import { Icon } from "../../../../../utils/general";
import { ExamReceipt } from "./ExamReceipt";

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
      <ExamReceipt
        examId={selectedSubmission.examId}
        submissionId={selectedSubmission.id}
        onBack={() => setSelectedSubmission(null)}
      />
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
              <tr
                key={sub.id}
                className="hover:bg-gray-50 transition cursor-pointer group"
                onClick={() => setSelectedSubmission(sub)}
                title="Clique para ver o comprovante detalhado"
              >
                <td className="p-4">
                  <div className="font-medium group-hover:text-blue-600 transition">{sub.displayName}</div>
                  <div className="text-xs text-gray-500">@{sub.username}</div>
                </td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                    sub.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {sub.status === 'completed' ? 'Concluída' : 'Em andamento'}
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
