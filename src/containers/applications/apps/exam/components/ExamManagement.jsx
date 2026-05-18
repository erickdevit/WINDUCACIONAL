import React, { useState, useEffect } from "react";
import { api } from "../../../../../lib/api";
import { Icon } from "../../../../../utils/general";
import { QuestionEditor } from "./QuestionEditor";

export const ExamManagement = ({ onBack }) => {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ title: "", description: "", timeLimit: 0 });
  const [editingExam, setEditingExam] = useState(null);
  const [editingMeta, setEditingMeta] = useState(null);

  useEffect(() => {
    loadExams();
  }, []);

  const loadExams = async () => {
    setLoading(true);
    try {
      const data = await api.getExams();
      setExams(data.exams || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const startEditMeta = (exam) => {
    setEditingMeta(exam);
    setFormData({
      title: exam.title || "",
      description: exam.description || "",
      timeLimit: exam.timeLimit || 0,
    });
    setShowForm(true);
  };

  const handleSaveMeta = async (e) => {
    e.preventDefault();
    try {
      if (editingMeta) {
        await api.updateExam(editingMeta.id, formData);
      } else {
        await api.createExam(formData);
      }
      setShowForm(false);
      setEditingMeta(null);
      setFormData({ title: "", description: "", timeLimit: 0 });
      loadExams();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleTogglePublish = async (exam) => {
    try {
      await api.publishExam(exam.id, !exam.isPublished);
      loadExams();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Excluir esta prova permanentemente?")) return;
    try {
      await api.deleteExam(id);
      loadExams();
    } catch (err) {
      alert(err.message);
    }
  };

  if (editingExam) {
    return <QuestionEditor exam={editingExam} onBack={() => { setEditingExam(null); loadExams(); }} />;
  }

  return (
    <div className="exam-management animate-fade-in">
      <div className="exam-section-head">
        <h2>Provas</h2>
        <button
          className="btn-primary"
          onClick={() => {
            setEditingMeta(null);
            setFormData({ title: "", description: "", timeLimit: 0 });
            setShowForm(true);
          }}
        >
          <Icon fafa="faPlus" width={14} /> Nova Prova
        </button>
      </div>

      {showForm && (
        <div className="exam-form-panel animate-scale-up">
          <h3>{editingMeta ? "Editar prova" : "Nova prova"}</h3>
          <form onSubmit={handleSaveMeta} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div>
                  <label className="exam-field-label">Título</label>
                  <input 
                    className="w-full p-3 border rounded-lg focus:ring-2 ring-blue-500 outline-none transition-all" 
                    required 
                    value={formData.title}
                    onChange={e => setFormData({...formData, title: e.target.value})}
                  />
                </div>
                <div>
                  <label className="exam-field-label">Tempo global (min)</label>
                  <input 
                    type="number"
                    min="0"
                    className="w-full p-3 border rounded-lg focus:ring-2 ring-blue-500 outline-none transition-all" 
                    value={formData.timeLimit}
                    onChange={e => setFormData({...formData, timeLimit: Number(e.target.value)})}
                  />
                </div>
            </div>
            <div>
              <label className="exam-field-label">Descrição</label>
              <textarea 
                className="w-full p-3 border rounded-lg focus:ring-2 ring-blue-500 outline-none transition-all" 
                rows={3}
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
              />
            </div>
            <div className="flex gap-2 justify-end pt-4 border-t">
              <button
                type="button"
                className="btn-secondary px-6"
                onClick={() => {
                  setShowForm(false);
                  setEditingMeta(null);
                  setFormData({ title: "", description: "", timeLimit: 0 });
                }}
              >
                Cancelar
              </button>
              <button type="submit" className="btn-primary px-8">{editingMeta ? "Salvar" : "Criar"}</button>
            </div>
          </form>
        </div>
      )}

      <div className="exam-table-panel">
        <table className="w-full text-left">
          <thead>
            <tr>
              <th className="p-5 font-bold text-xs text-gray-400 uppercase tracking-widest">Status</th>
              <th className="p-5 font-bold text-xs text-gray-400 uppercase tracking-widest">Título</th>
              <th className="p-5 font-bold text-xs text-gray-400 uppercase tracking-widest text-center">Tempo</th>
              <th className="p-5 font-bold text-xs text-gray-400 uppercase tracking-widest text-center">Criada em</th>
              <th className="p-5 font-bold text-xs text-gray-400 uppercase tracking-widest text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {exams.map(exam => (
              <tr key={exam.id} className="hover:bg-gray-50 transition group">
                <td className="p-5">
                   <button 
                    onClick={() => handleTogglePublish(exam)}
                    className={`exam-status-pill ${
                      exam.isPublished ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                    }`}
                    title={exam.isPublished ? "Clique para desativar" : "Clique para publicar"}
                   >
                     {exam.isPublished ? 'Publicada' : 'Rascunho'}
                   </button>
                </td>
                <td className="p-5">
                  <div className="font-bold text-gray-800 group-hover:text-blue-600 transition">{exam.title}</div>
                  <div className="text-xs text-gray-400 line-clamp-1">{exam.description}</div>
                </td>
                <td className="p-5 text-sm font-bold text-gray-500 text-center">
                   {exam.timeLimit > 0 ? (
                     <span className="flex items-center justify-center gap-1">
                        <Icon fafa="faClock" width={10} /> {exam.timeLimit}m
                     </span>
                   ) : '---'}
                </td>
                <td className="p-5 text-xs text-gray-400 text-center">
                  {new Date(exam.createdAt).toLocaleDateString()}
                </td>
                <td className="p-5 text-right space-x-2">
                  <button className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition" onClick={() => setEditingExam(exam)} title="Gerenciar Questões">
                    <Icon fafa="faEdit" width={14} />
                  </button>
                  <button className="p-2 hover:bg-gray-100 text-gray-600 rounded-lg transition" onClick={() => startEditMeta(exam)} title="Editar dados e tempo">
                    <Icon fafa="faClock" width={14} />
                  </button>
                  <button className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition" onClick={() => handleDelete(exam.id)}>
                    <Icon fafa="faTrash" width={14} />
                  </button>
                </td>
              </tr>
            ))}
            {exams.length === 0 && !loading && (
              <tr>
                <td colSpan={5} className="p-20 text-center text-gray-400 italic">
                   <div className="mb-4 flex justify-center opacity-10">
                      <Icon src="exam" width={100} />
                   </div>
                   Nenhuma prova cadastrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
