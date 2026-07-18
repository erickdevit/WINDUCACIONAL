import React from "react";

export const DeleteBuildModal = ({ build, deleting, onCancel, onConfirm }) => (
  <div className="pcModalBackdrop pcConfirmBackdrop">
    <section
      className="pcConfirmModal"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="pc-delete-title"
    >
      <span className="pcConfirmMark" aria-hidden="true">
        !
      </span>
      <h2 id="pc-delete-title">Excluir montagem?</h2>
      <p>
        “{build.name}” será removido da sua galeria e não poderá ser recuperado.
      </p>
      <div>
        <button type="button" className="pcResetButton" onClick={onCancel}>
          Cancelar
        </button>
        <button
          type="button"
          className="pcDeleteButton"
          disabled={deleting}
          onClick={onConfirm}
        >
          {deleting ? "Excluindo..." : "Excluir definitivamente"}
        </button>
      </div>
    </section>
  </div>
);
