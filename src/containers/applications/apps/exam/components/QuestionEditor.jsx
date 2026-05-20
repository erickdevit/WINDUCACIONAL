import React, { useState, useEffect } from "react";
import { api } from "../../../../../lib/api";
import { Icon } from "../../../../../utils/general";

export const QuestionEditor = ({ exam, onBack }) => {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [newQ, setNewNewQ] = useState({
    type: "mcq",
    text: "",
    options: ["", "", "", ""],
    correctAnswer: "a",
    points: 1,
    timeLimit: 0,
    validationRules: []
  });

  const multipleChoiceQuestions = questions.filter(q => q.type === "mcq");
  const practicalQuestions = questions.filter(q => q.type === "practical");

  useEffect(() => {
    loadQuestions();
  }, []);

  const loadQuestions = async () => {
    setLoading(true);
    try {
      const data = await api.getExamDetails(exam.id);
      setQuestions(data.questions || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (q) => {
    setEditingId(q.id);
    setNewNewQ({
      type: q.type,
      text: q.text,
      options: q.options || ["", "", "", ""],
      correctAnswer: q.correctAnswer || "a",
      points: q.points,
      timeLimit: q.timeLimit || 0,
      validationRules: q.validationRules || []
    });
    setShowAdd(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.updateExamQuestion(exam.id, editingId, newQ);
      } else {
        await api.addExamQuestion(exam.id, newQ);
      }
      resetForm();
      loadQuestions();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Excluir esta questão?")) return;
    try {
      await api.deleteExamQuestion(exam.id, id);
      loadQuestions();
    } catch (err) {
      alert(err.message);
    }
  };

  const resetForm = () => {
    setShowAdd(false);
    setEditingId(null);
    setNewNewQ({
      type: "mcq",
      text: "",
      options: ["", "", "", ""],
      correctAnswer: "a",
      points: 1,
      timeLimit: 0,
      validationRules: []
    });
  };

  const addRule = () => {
    setNewNewQ({
      ...newQ,
      validationRules: [...newQ.validationRules, { type: "FILE_EXISTS", path: "", content: "", name: "" }]
    });
  };

  const renderQuestionRow = (q, index) => (
    <div key={q.id} className="question-row group">
      <div className="question-index">
        {index + 1}
      </div>
      <div className="flex-grow">
        <div className="flex justify-between items-start mb-2">
          <span className={`question-type ${q.type === 'mcq' ? 'mcq' : 'practical'}`}>
            {q.type === 'mcq' ? 'Múltipla escolha' : 'Prática'}
          </span>
          <span className="question-meta">{q.points} pts{q.timeLimit > 0 ? ` · ${q.timeLimit} min` : ""}</span>
        </div>
        <p className="text-gray-800 font-medium">{q.text}</p>
        {q.type === 'mcq' && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            {(q.options || []).map((opt, idx) => (
              <div key={idx} className={`text-xs p-2 rounded border ${q.correctAnswer === String.fromCharCode(97 + idx) ? 'border-green-300 bg-green-50 text-green-700' : 'bg-gray-50 text-gray-500'}`}>
                <span className="font-bold mr-1">{String.fromCharCode(97 + idx)})</span> {opt}
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="flex gap-1">
        <button className="p-2 text-gray-300 hover:text-blue-600 transition" onClick={() => startEdit(q)} title="Editar questão">
          <Icon fafa="faPen" width={14} />
        </button>
        <button className="p-2 text-gray-300 hover:text-red-500 transition" onClick={() => handleDelete(q.id)} title="Excluir questão">
          <Icon fafa="faTrash" width={14} />
        </button>
      </div>
    </div>
  );

  const renderQuestionSection = (title, sectionQuestions, emptyText) => (
    <section className="question-section">
      <div className="question-section-head">
        <h3>{title}</h3>
        <span>{sectionQuestions.length}</span>
      </div>
      <div className="question-list">
        {sectionQuestions.map((q, i) => renderQuestionRow(q, i))}
        {sectionQuestions.length === 0 && !loading && (
          <div className="exam-empty compact">{emptyText}</div>
        )}
      </div>
    </section>
  );

  return (
    <div className="question-editor animate-fade-in">
      <div className="exam-section-head with-back">
        <button onClick={onBack} className="icon-button" title="Voltar">
          <Icon fafa="faArrowLeft" width={16} />
        </button>
        <div>
          <h2>{exam.title}</h2>
          <span>{questions.length} questão{questions.length === 1 ? "" : "ões"}</span>
        </div>
      </div>

      <div className="question-management-scroll win11Scroll">
        {renderQuestionSection("Múltipla escolha", multipleChoiceQuestions, "Nenhuma questão de múltipla escolha.")}
        {renderQuestionSection("Práticas", practicalQuestions, "Nenhuma questão prática.")}
        <button className="question-add-button" onClick={() => setShowAdd(true)}>
          Adicionar questão
        </button>
      </div>

      {showAdd && (
        <div className="question-modal-backdrop" role="presentation">
          <div className="question-modal animate-scale-up" role="dialog" aria-modal="true" aria-labelledby="question-modal-title">
            <div className="question-modal-head">
              <h3 id="question-modal-title">{editingId ? 'Editar questão' : 'Nova questão'}</h3>
              <button type="button" className="icon-button" onClick={resetForm} title="Fechar">
                <Icon fafa="faXmark" width={14} />
              </button>
            </div>
            <div className="question-form-panel win11Scroll">
              <form onSubmit={handleSave} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="exam-field-label">Tipo</label>
                    <select 
                      className="w-full p-2 border rounded"
                      value={newQ.type}
                      onChange={e => setNewNewQ({...newQ, type: e.target.value})}
                    >
                      <option value="mcq">Múltipla escolha</option>
                      <option value="practical">Tarefa prática</option>
                    </select>
                  </div>
                  <div>
                    <label className="exam-field-label">Pontos</label>
                    <input 
                      type="number"
                      className="w-full p-2 border rounded"
                      value={newQ.points}
                      onChange={e => setNewNewQ({...newQ, points: Number(e.target.value)})}
                    />
                  </div>
                  <div>
                    <label className="exam-field-label">Tempo (min)</label>
                    <input
                      type="number"
                      min="0"
                      className="w-full p-2 border rounded"
                      placeholder="0 = tempo global"
                      value={newQ.timeLimit}
                      onChange={e => setNewNewQ({...newQ, timeLimit: Number(e.target.value)})}
                    />
                  </div>
                </div>

                <div>
                  <label className="exam-field-label">Enunciado</label>
                  <textarea 
                    className="w-full p-2 border rounded"
                    rows={3}
                    required
                    value={newQ.text}
                    onChange={e => setNewNewQ({...newQ, text: e.target.value})}
                  />
                </div>

                {newQ.type === "mcq" ? (
                  <div className="space-y-3">
                    <label className="exam-field-label">Alternativas</label>
                    {newQ.options.map((opt, i) => (
                      <div key={i} className="flex gap-3 items-center">
                        <span className="font-bold text-gray-400">{String.fromCharCode(97 + i)})</span>
                        <input 
                          className="flex-grow p-2 border rounded"
                          value={opt}
                          onChange={e => {
                            const next = [...newQ.options];
                            next[i] = e.target.value;
                            setNewNewQ({...newQ, options: next});
                          }}
                        />
                        <input 
                          type="radio"
                          name="correct"
                          checked={newQ.correctAnswer === String.fromCharCode(97 + i)}
                          onChange={() => setNewNewQ({...newQ, correctAnswer: String.fromCharCode(97 + i)})}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <label className="exam-field-label">Validação</label>
                      <button type="button" onClick={addRule} className="btn-secondary compact">Adicionar regra</button>
                    </div>
                    {newQ.validationRules.map((rule, i) => (
                      <div key={i} className="p-4 bg-gray-50 rounded-lg border flex gap-3 flex-wrap">
                        <select 
                          className="text-xs p-1 border rounded"
                          value={rule.type}
                          onChange={e => {
                            const next = [...newQ.validationRules];
                            next[i].type = e.target.value;
                            setNewNewQ({...newQ, validationRules: next});
                          }}
                        >
                          <option value="FILE_EXISTS">Arquivo existe</option>
                          <option value="FILE_CONTAINS">Conteúdo do arquivo</option>
                          <option value="ACTION_PERFORMED">Ação/atalho</option>
                        </select>
                        {rule.type === 'ACTION_PERFORMED' ? (
                          <select 
                            className="text-xs p-1 border rounded flex-grow"
                            value={rule.name}
                            onChange={e => {
                              const next = [...newQ.validationRules];
                              next[i].name = e.target.value;
                              setNewNewQ({...newQ, validationRules: next});
                            }}
                          >
                            <option value="">Selecione a ação</option>
                            <option value="EXPLORER">Abrir Explorador de Arquivos (Win+E)</option>
                            <option value="NOTEPAD">Abrir Bloco de Notas</option>
                            <option value="TERMINAL">Abrir Terminal (Win+R)</option>
                            <option value="SETTINGS">Abrir Configurações (Win+I)</option>
                            <option value="CALCUAPP">Abrir Calculadora</option>
                            <option value="CAMERA">Abrir Câmera</option>
                            <option value="CHATAPP">Abrir Chat</option>
                            <option value="MSEDGE">Abrir Navegador</option>
                            <option value="TASKMANAGER">Abrir Gerenciador de Tarefas (Ctrl+Shift+Esc)</option>
                          </select>
                        ) : (
                          <input 
                            placeholder="Caminho"
                            className="text-xs p-1 border rounded flex-grow"
                            value={rule.path}
                            onChange={e => {
                              const next = [...newQ.validationRules];
                              next[i].path = e.target.value;
                              setNewNewQ({...newQ, validationRules: next});
                            }}
                          />
                        )}
                        {rule.type === 'FILE_CONTAINS' && (
                          <input
                            placeholder="Conteúdo esperado"
                            className="text-xs p-1 border rounded flex-grow"
                            value={rule.content || ""}
                            onChange={e => {
                              const next = [...newQ.validationRules];
                              next[i].content = e.target.value;
                              setNewNewQ({...newQ, validationRules: next});
                            }}
                          />
                        )}
                        <button type="button" className="text-red-500" onClick={() => {
                          const next = newQ.validationRules.filter((_, idx) => idx !== i);
                          setNewNewQ({...newQ, validationRules: next});
                        }}>
                          <Icon fafa="faTrash" width={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2 justify-end border-t pt-4">
                  <button type="button" className="btn-secondary" onClick={resetForm}>Cancelar</button>
                  <button type="submit" className="btn-primary">{editingId ? 'Salvar' : 'Criar'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
