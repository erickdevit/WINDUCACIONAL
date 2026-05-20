import React, { useState, useEffect } from "react";
import { api } from "../../../../../lib/api";
import { Icon } from "../../../../../utils/general";
import { ExamReceipt } from "./ExamReceipt";

export const StudentHistory = () => {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await api.getStudentHistory();
      setSubmissions(data.submissions || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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
    <div className="exam-student-history animate-fade-in">
      <h2 className="text-2xl font-bold mb-6">Provas Realizadas</h2>
      <div className="exam-results-panel bg-white border rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-4 font-bold text-sm">Prova</th>
              <th className="p-4 font-bold text-sm">Data</th>
              <th className="p-4 font-bold text-sm text-center">Nota</th>
              <th className="p-4 font-bold text-sm text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {submissions.map(sub => (
              <tr
                key={sub.id}
                className="hover:bg-gray-50 transition cursor-pointer"
                onClick={() => sub.status === "completed" && setSelectedSubmission(sub)}
                title={sub.status === "completed" ? "Clique para ver o comprovante" : ""}
              >
                <td className="p-4">
                  <div className="font-bold text-blue-700">{sub.examTitle}</div>
                  <div className="text-[10px] text-gray-400 font-mono">{sub.id.slice(0, 8)}</div>
                </td>
                <td className="p-4 text-sm text-gray-500">
                  {sub.completedAt ? new Date(sub.completedAt).toLocaleString() : 'Não finalizada'}
                </td>
                <td className="p-4 text-center">
                  <span className="text-xl font-black text-blue-600">{sub.totalScore}</span>
                </td>
                <td className="p-4 text-right">
                   <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase ${
                    sub.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {sub.status === 'completed' ? 'Concluída' : 'Em Andamento'}
                  </span>
                </td>
              </tr>
            ))}
            {submissions.length === 0 && !loading && (
              <tr className="hover:bg-gray-50 transition">
                <td colSpan={4} className="p-20 text-center text-gray-400 italic">
                   <div className="mb-4 flex justify-center opacity-10">
                      <Icon src="exam" width={80} />
                   </div>
                   Você ainda não realizou nenhuma prova.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
