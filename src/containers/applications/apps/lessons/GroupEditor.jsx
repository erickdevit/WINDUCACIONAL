import React, { useEffect, useMemo, useState } from "react";

export const GroupEditor = ({
  group,
  students,
  saving,
  onCancel,
  onSubmit,
}) => {
  const [name, setName] = useState("");
  const [studentIds, setStudentIds] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setName(group?.name || "");
    setStudentIds((group?.members || []).map((member) => member.id));
    setSearch("");
  }, [group]);

  const selectedStudents = useMemo(() => new Set(studentIds), [studentIds]);
  const visibleStudents = students.filter((student) => {
    const haystack = `${student.displayName} ${student.username}`.toLowerCase();
    return haystack.includes(search.trim().toLowerCase());
  });

  const toggleStudent = (studentId) => {
    setStudentIds((current) =>
      current.includes(studentId)
        ? current.filter((id) => id !== studentId)
        : [...current, studentId]
    );
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit({ name: name.trim(), studentIds });
  };

  return (
    <section className="lessonEditorPanel groupEditorPanel">
      <div className="lessonPanelHeading">
        <div>
          <span className="lessonEyebrow">Grupo da turma</span>
          <h2>{group ? "Editar grupo" : "Novo grupo"}</h2>
        </div>
        <button type="button" className="lessonTextButton" onClick={onCancel}>
          Cancelar
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <label>
          <span>Nome do grupo</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={100}
            placeholder="Ex.: Equipe Azul"
            autoFocus
            required
          />
        </label>

        <div className="groupStudentHeader">
          <div>
            <strong>Membros</strong>
            <span>
              {studentIds.length} selecionado
              {studentIds.length === 1 ? "" : "s"}
            </span>
          </div>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar aluno"
          />
        </div>

        <div className="groupStudentList win11Scroll">
          {visibleStudents.map((student) => (
            <label key={student.id}>
              <input
                type="checkbox"
                checked={selectedStudents.has(student.id)}
                onChange={() => toggleStudent(student.id)}
              />
              <span className="studentInitial">
                {student.displayName.charAt(0).toUpperCase()}
              </span>
              <span>
                <strong>{student.displayName}</strong>
                <small>@{student.username}</small>
              </span>
            </label>
          ))}
          {visibleStudents.length === 0 && (
            <p className="lessonMutedText">
              Nenhum aluno encontrado nesta turma.
            </p>
          )}
        </div>

        <div className="lessonFormActions">
          <button
            type="button"
            className="lessonSecondaryButton"
            onClick={onCancel}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="lessonPrimaryButton"
            disabled={saving || !name.trim()}
          >
            {saving ? "Salvando..." : group ? "Salvar grupo" : "Criar grupo"}
          </button>
        </div>
      </form>
    </section>
  );
};
