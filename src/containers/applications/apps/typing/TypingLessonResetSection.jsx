import { useEffect, useMemo, useState } from "react";
import { api } from "../../../../lib/api";

export const TypingLessonResetSection = ({
  turmas = [],
  onResetSuccess = null,
}) => {
  const [scope, setScope] = useState("turma");
  const [selectedTurmaId, setSelectedTurmaId] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [clearRanking, setClearRanking] = useState(false);
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [status, setStatus] = useState(null);

  const availableTurmas = useMemo(
    () =>
      turmas.filter(
        (turma) =>
          String(
            turma.studentType || turma.student_type || "normal"
          ).toLowerCase() === "normal"
      ),
    [turmas]
  );

  useEffect(() => {
    let active = true;
    setLoadingStudents(true);
    api
      .getUsers()
      .then((data) => {
        if (active) setStudents(data.users || []);
      })
      .catch(() => {
        if (active) setStudents([]);
      })
      .finally(() => {
        if (active) setLoadingStudents(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!availableTurmas.some((turma) => turma.id === selectedTurmaId)) {
      setSelectedTurmaId(availableTurmas[0]?.id || "");
    }
  }, [availableTurmas, selectedTurmaId]);

  const availableStudents = useMemo(
    () =>
      students.filter((student) => {
        if (student.role !== "aluno" || student.active === false) return false;
        const studentType = String(
          student.studentType || student.student_type || "normal"
        ).toLowerCase();
        if (studentType !== "normal") return false;
        const studentTurmaId = student.turmaId || student.turma_id;
        return Boolean(selectedTurmaId && studentTurmaId === selectedTurmaId);
      }),
    [students, selectedTurmaId]
  );

  useEffect(() => {
    if (
      !availableStudents.some((student) => student.id === selectedStudentId)
    ) {
      setSelectedStudentId(availableStudents[0]?.id || "");
    }
  }, [availableStudents, selectedStudentId]);

  const handleResetSubmit = async (event) => {
    event.preventDefault();
    setStatus(null);

    const selectedTurma = availableTurmas.find(
      (turma) => turma.id === selectedTurmaId
    );

    if (scope === "turma" && !selectedTurma) {
      setStatus({
        type: "error",
        text: "Selecione uma turma Normal válida para resetar.",
      });
      return;
    }

    const selectedStudent = availableStudents.find(
      (student) => student.id === selectedStudentId
    );

    if (scope === "student" && !selectedStudent) {
      setStatus({
        type: "error",
        text: "Selecione um aluno Normal válido para resetar.",
      });
      return;
    }

    const targetDesc =
      scope === "turma"
        ? `da turma ${selectedTurma.nome} (${selectedTurma.code})`
        : `do aluno ${selectedStudent.displayName || selectedStudent.username}`;

    const rankingWarning = clearRanking
      ? " As pontuações do Ranking de Lições também serão excluídas."
      : " As pontuações do Ranking de Lições serão mantidas intactas.";

    const confirmed = window.confirm(
      `Deseja realmente resetar o progresso das lições ${targetDesc}? Todas as lições concluídas voltarão ao estado bloqueado, restando apenas a Lição 1 liberada.${rankingWarning}`
    );

    if (!confirmed) return;

    setResetting(true);
    try {
      const payload = {
        scope,
        turmaId: selectedTurmaId,
        studentId: scope === "student" ? selectedStudentId : undefined,
        clearRanking,
      };

      const result = await api.resetTypingLessonProgress(payload);

      const targetLabel =
        scope === "turma"
          ? `da turma ${selectedTurma.nome}`
          : `do aluno ${
              selectedStudent.displayName || selectedStudent.username
            }`;

      const rankingSummary = clearRanking
        ? ` As pontuações do Ranking de Lições também foram zeradas (${
            result.deletedScores || 0
          } registros removidos).`
        : " As pontuações do Ranking de Lições foram mantidas.";

      setStatus({
        type: "success",
        text: `Progresso das lições ${targetLabel} resetado com sucesso. Todas as fases foram bloqueadas e apenas a Lição 1 está liberada.${rankingSummary}`,
      });

      onResetSuccess?.(result);
    } catch (error) {
      setStatus({
        type: "error",
        text:
          error.message || "Não foi possível resetar o progresso das lições.",
      });
    } finally {
      setResetting(false);
    }
  };

  const isSubmitDisabled =
    resetting ||
    (scope === "turma" && !selectedTurmaId) ||
    (scope === "student" &&
      (!selectedStudentId || availableStudents.length === 0));

  return (
    <form
      className="bg-white dark:bg-[#18181b] border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm"
      onSubmit={handleResetSubmit}
      aria-label="Formulário de reset de lições"
    >
      <div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
          Resetar progresso das lições
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Reinicie a progressão das lições convencionais para uma turma Normal
          inteira ou para um aluno específico. Todas as lições concluídas
          voltarão ao estado bloqueado, restando apenas a Lição 1 liberada.
        </p>
      </div>

      <div className="mt-5 space-y-4">
        <div>
          <label className="text-sm font-black text-gray-700 dark:text-gray-300 block mb-2">
            Escopo do reset
          </label>
          <div className="flex flex-wrap gap-4">
            <label className="inline-flex items-center gap-2 cursor-pointer text-sm font-bold text-gray-900 dark:text-white">
              <input
                type="radio"
                name="typingLessonResetScope"
                value="turma"
                checked={scope === "turma"}
                onChange={() => {
                  setScope("turma");
                  setStatus(null);
                }}
                className="text-[#ffcc02] focus:ring-[#ffcc02]"
              />
              Turma inteira
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer text-sm font-bold text-gray-900 dark:text-white">
              <input
                type="radio"
                name="typingLessonResetScope"
                value="student"
                checked={scope === "student"}
                onChange={() => {
                  setScope("student");
                  setStatus(null);
                }}
                className="text-[#ffcc02] focus:ring-[#ffcc02]"
              />
              Aluno específico
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="resetTurmaSelect"
              className="text-sm font-black text-gray-700 dark:text-gray-300 block mb-1"
            >
              Turma Normal
            </label>
            <select
              id="resetTurmaSelect"
              value={selectedTurmaId}
              onChange={(event) => {
                setSelectedTurmaId(event.target.value);
                setStatus(null);
              }}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-black text-gray-900 outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            >
              {availableTurmas.length === 0 ? (
                <option value="">Nenhuma turma Normal cadastrada</option>
              ) : (
                availableTurmas.map((turma) => (
                  <option key={turma.id} value={turma.id}>
                    {turma.nome} ({turma.code})
                  </option>
                ))
              )}
            </select>
          </div>

          {scope === "student" && (
            <div>
              <label
                htmlFor="resetStudentSelect"
                className="text-sm font-black text-gray-700 dark:text-gray-300 block mb-1"
              >
                Aluno
              </label>
              <select
                id="resetStudentSelect"
                value={selectedStudentId}
                onChange={(event) => {
                  setSelectedStudentId(event.target.value);
                  setStatus(null);
                }}
                disabled={loadingStudents || availableStudents.length === 0}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-black text-gray-900 outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white disabled:opacity-50"
              >
                {loadingStudents ? (
                  <option value="">Carregando alunos...</option>
                ) : availableStudents.length === 0 ? (
                  <option value="">
                    Nenhum aluno Normal cadastrado nesta turma
                  </option>
                ) : (
                  availableStudents.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.displayName || student.username} (
                      {student.username})
                    </option>
                  ))
                )}
              </select>
            </div>
          )}
        </div>

        <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 p-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              id="clearRankingCheckbox"
              checked={clearRanking}
              onChange={(event) => setClearRanking(event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
            />
            <div>
              <span className="text-sm font-bold text-gray-900 dark:text-white block">
                Zerar também a pontuação no Ranking de Lições
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400 block mt-0.5">
                Se marcada, os registros de pontuação em typing_scores do alvo
                selecionado serão removidos. Se desmarcada, as pontuações e
                posições no ranking serão mantidas intactas enquanto a
                progressão recomeça na Lição 1.
              </span>
            </div>
          </label>
        </div>
      </div>

      <div className="mt-5 flex justify-end">
        <button
          type="submit"
          disabled={isSubmitDisabled}
          className="px-5 py-3 rounded-lg bg-red-600 text-white font-black hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {resetting ? "Resetando..." : "Resetar progresso das lições"}
        </button>
      </div>

      {status && (
        <div
          role="alert"
          className={`mt-4 rounded-lg px-4 py-3 text-sm font-bold ${
            status.type === "success"
              ? "bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800"
              : "bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800"
          }`}
        >
          {status.text}
        </div>
      )}
    </form>
  );
};
