import React, { useState, useEffect } from "react";
import { api } from "../../../../../lib/api";
import { Icon } from "../../../../../utils/general";

export const ExamAssignment = () => {
  const [turmas, setTurmas] = useState([]);
  const [selectedTurmaId, setSelectedTurmaId] = useState("");
  const [students, setStudents] = useState([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [exams, setExams] = useState([]);
  const [selectedExamIds, setSelectedExamIds] = useState([]);
  const [selectedExamPicker, setSelectedExamPicker] = useState("");
  const [loading, setLoading] = useState(false);
  const [distributeMode, setDistributeMode] = useState("all"); // 'all', 'balanced'

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const [tData, eData] = await Promise.all([
        api.get("/api/turmas"),
        api.getExams(),
      ]);
      setTurmas(tData.turmas || []);
      setExams((eData.exams || []).filter((e) => e.isPublished));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (selectedTurmaId) {
      loadStudents(selectedTurmaId);
    } else {
      setStudents([]);
    }
  }, [selectedTurmaId]);

  const loadStudents = async (turmaId) => {
    setLoading(true);
    try {
      const data = await api.get("/api/users");
      const filtered = (data.users || []).filter(
        (u) => u.role === "aluno" && u.turmaId === turmaId
      );
      setStudents(filtered);
      setSelectedStudentIds([]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleStudent = (id) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleAllStudents = () => {
    if (selectedStudentIds.length === students.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(students.map((s) => s.id));
    }
  };

  const toggleExam = (id) => {
    setSelectedExamIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const addSelectedExam = () => {
    if (!selectedExamPicker) return;
    setSelectedExamIds((prev) =>
      prev.includes(selectedExamPicker) ? prev : [...prev, selectedExamPicker]
    );
    setSelectedExamPicker("");
  };

  const handleApply = async () => {
    if (selectedStudentIds.length === 0 || selectedExamIds.length === 0) {
      alert("Selecione pelo menos um aluno e uma prova.");
      return;
    }

    const assignments = [];
    if (distributeMode === "all") {
      // Todos os alunos recebem todas as provas selecionadas
      selectedStudentIds.forEach((uId) => {
        selectedExamIds.forEach((eId) => {
          assignments.push({ userId: uId, examId: eId });
        });
      });
    } else if (distributeMode === "balanced") {
      // Divide os alunos entre as provas selecionadas
      selectedStudentIds.forEach((uId, index) => {
        const examId = selectedExamIds[index % selectedExamIds.length];
        assignments.push({ userId: uId, examId });
      });
    }

    setLoading(true);
    try {
      const response = await api.assignExamBatch({
        assignments,
        mode: distributeMode,
      });
      const application = response.application;
      if (application) {
        alert(
          `Aplicação registrada.\nCriadas: ${application.totalCreated}\nJá existentes: ${application.totalExisting}\nIgnoradas: ${application.totalSkipped}`
        );
      } else {
        alert("Provas aplicadas com sucesso!");
      }
      setSelectedStudentIds([]);
      setSelectedExamIds([]);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="exam-assignment animate-fade-in space-y-6 pb-20">
      <div className="exam-section-head">
        <h2>Aplicação</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="exam-panel p-5">
            <h3 className="exam-card-title">
              <Icon fafa="faUsers" width={15} /> Alunos
            </h3>

            <div className="mb-4">
              <label className="exam-field-label">Turma</label>
              <select
                className="w-full p-3 border bg-white outline-none"
                value={selectedTurmaId}
                onChange={(e) => setSelectedTurmaId(e.target.value)}
              >
                <option value="">Selecione uma turma</option>
                {turmas.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nome} ({t.code})
                  </option>
                ))}
              </select>
            </div>

            {selectedTurmaId && (
              <div className="exam-student-table-wrap win11Scroll">
                <div
                  className="exam-card-list exam-mobile-only"
                  style={{ padding: "0 0 12px 0" }}
                >
                  <div
                    className="flex items-center gap-3 p-3 bg-gray-50 border rounded-lg mb-2 cursor-pointer"
                    onClick={toggleAllStudents}
                  >
                    <input
                      type="checkbox"
                      checked={
                        students.length > 0 &&
                        selectedStudentIds.length === students.length
                      }
                      readOnly
                      className="w-5 h-5"
                    />
                    <span className="text-sm font-bold text-gray-700">
                      Selecionar todos os alunos
                    </span>
                  </div>
                  {students.map((s) => (
                    <label
                      key={s.id}
                      className={`flex items-center gap-3 p-3 border rounded-lg transition cursor-pointer ${
                        selectedStudentIds.includes(s.id)
                          ? "border-blue-500 bg-blue-50"
                          : "bg-white"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedStudentIds.includes(s.id)}
                        onChange={() => toggleStudent(s.id)}
                        className="w-5 h-5 flex-shrink-0"
                      />
                      <div className="flex flex-col overflow-hidden">
                        <span className="font-bold text-gray-800 text-sm truncate">
                          {s.displayName}
                        </span>
                        <span className="text-xs text-gray-400 truncate">
                          @{s.username}
                        </span>
                      </div>
                    </label>
                  ))}
                  {students.length === 0 && (
                    <div className="p-4 text-center text-gray-400 italic">
                      Nenhum aluno nesta turma.
                    </div>
                  )}
                </div>

                <table className="exam-student-table exam-desktop-table">
                  <thead>
                    <tr>
                      <th className="p-3 w-10">
                        <input
                          type="checkbox"
                          checked={
                            students.length > 0 &&
                            selectedStudentIds.length === students.length
                          }
                          onChange={toggleAllStudents}
                        />
                      </th>
                      <th className="p-3 font-bold text-gray-500 uppercase text-[10px]">
                        Aluno
                      </th>
                      <th className="p-3 font-bold text-gray-500 uppercase text-[10px]">
                        Usuário
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {students.map((s) => (
                      <tr
                        key={s.id}
                        className="hover:bg-blue-50 transition cursor-pointer"
                        onClick={() => toggleStudent(s.id)}
                      >
                        <td className="p-3">
                          <input
                            type="checkbox"
                            checked={selectedStudentIds.includes(s.id)}
                            readOnly
                          />
                        </td>
                        <td className="p-3 font-bold text-gray-700">
                          {s.displayName}
                        </td>
                        <td className="p-3 text-gray-400">@{s.username}</td>
                      </tr>
                    ))}
                    {students.length === 0 && (
                      <tr>
                        <td
                          colSpan={3}
                          className="p-10 text-center text-gray-400"
                        >
                          Nenhum aluno nesta turma.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="exam-panel p-5">
            <h3 className="exam-card-title">
              <Icon src="exam" width={16} /> Prova
            </h3>
            <div className="exam-picker-row">
              <select
                className="w-full p-3 border bg-white outline-none"
                value={selectedExamPicker}
                onChange={(e) => setSelectedExamPicker(e.target.value)}
              >
                <option value="">Selecione uma prova</option>
                {exams.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.title}
                    {e.timeLimit > 0 ? ` (${e.timeLimit} min)` : ""}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn-secondary"
                onClick={addSelectedExam}
              >
                Adicionar
              </button>
            </div>

            <div className="selected-exam-list win11Scroll">
              {selectedExamIds.map((id) => {
                const exam = exams.find((item) => item.id === id);
                if (!exam) return null;
                return (
                  <div key={id} className="selected-exam-row">
                    <span>
                      <strong>{exam.title}</strong>
                      <small>
                        {exam.timeLimit > 0
                          ? `${exam.timeLimit} min`
                          : "Sem limite"}
                      </small>
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleExam(id)}
                      title="Remover prova"
                    >
                      <Icon fafa="faXmark" width={12} />
                    </button>
                  </div>
                );
              })}
              {exams.length === 0 ? (
                <div className="exam-empty compact">
                  Nenhuma prova publicada.
                </div>
              ) : (
                selectedExamIds.length === 0 && (
                  <div className="exam-empty compact">
                    Nenhuma prova selecionada.
                  </div>
                )
              )}
            </div>
          </div>

          <div className="exam-panel p-5">
            <h3 className="exam-card-title">
              <Icon fafa="faGear" width={15} /> Modo
            </h3>

            <div className="space-y-3 mb-5">
              <label className="exam-radio-row">
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="mode"
                    checked={distributeMode === "all"}
                    onChange={() => setDistributeMode("all")}
                  />
                  <span>Todas para todos</span>
                </div>
              </label>
              <label className="exam-radio-row">
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="mode"
                    checked={distributeMode === "balanced"}
                    onChange={() => setDistributeMode("balanced")}
                  />
                  <span>Distribuir versões</span>
                </div>
              </label>
            </div>

            <button
              disabled={
                loading ||
                selectedStudentIds.length === 0 ||
                selectedExamIds.length === 0
              }
              className="w-full btn-primary"
              onClick={handleApply}
            >
              {loading
                ? "Processando..."
                : `Aplicar para ${selectedStudentIds.length}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
