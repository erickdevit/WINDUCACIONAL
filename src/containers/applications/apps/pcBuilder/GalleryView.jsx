import React from "react";
import { getPcPart } from "../../../../../server/domain/pcBuilderCatalog.mjs";

const formatDate = (value) =>
  new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));

const BuildCard = ({ build, onDelete, onOpen }) => {
  const cpu = getPcPart(build.components?.cpu);
  const gpu = getPcPart(build.components?.gpu);
  const success = build.outcome === "success";

  return (
    <article className="pcGalleryCard" data-outcome={build.outcome}>
      <div className="pcGalleryPreview">
        <div className="pcMiniTower">
          <span />
          <i />
        </div>
        <div className="pcMiniMonitor">
          <span>{success ? "W" : "!"}</span>
          <i />
        </div>
        <strong>{success ? "INICIOU" : "FALHOU"}</strong>
      </div>
      <div className="pcGalleryCardBody">
        <div className="pcGalleryMeta">
          <span>{success ? "Montagem funcional" : "Teste com falha"}</span>
          <time>{formatDate(build.createdAt)}</time>
        </div>
        <h2>{build.name}</h2>
        <p>{cpu?.name || "CPU ausente"}</p>
        <p>{gpu?.name || "Vídeo ausente"}</p>
        <div className="pcGalleryScore">
          <span>Desempenho</span>
          <strong>
            {build.validation?.metrics?.performanceScore || 0}/100
          </strong>
        </div>
        <div className="pcGalleryActions">
          <button type="button" onClick={() => onOpen(build)}>
            Rever montagem
          </button>
          <button
            type="button"
            className="danger"
            onClick={() => onDelete(build)}
          >
            Excluir
          </button>
        </div>
      </div>
    </article>
  );
};

export const GalleryView = ({
  builds,
  error,
  loading,
  onDelete,
  onOpen,
  onRefresh,
  onStartBuild,
}) => (
  <main className="pcGalleryView">
    <section className="pcGalleryHeading">
      <div>
        <span className="pcEyebrow">Arquivo pessoal</span>
        <h1>Galeria de computadores</h1>
        <p>
          Reveja cada teste salvo, compare escolhas e identifique o que fez a
          montagem iniciar ou falhar.
        </p>
      </div>
      <button type="button" className="pcInstallButton" onClick={onStartBuild}>
        Nova montagem
      </button>
    </section>

    {error && (
      <div className="pcGalleryError" role="alert">
        <span>{error}</span>
        <button type="button" onClick={onRefresh}>
          Tentar novamente
        </button>
      </div>
    )}

    {loading ? (
      <div className="pcGalleryLoading">
        <span />
        Carregando sua galeria...
      </div>
    ) : builds.length > 0 ? (
      <section className="pcGalleryGrid" aria-label="Computadores salvos">
        {builds.map((build) => (
          <BuildCard
            key={build.id}
            build={build}
            onDelete={onDelete}
            onOpen={onOpen}
          />
        ))}
      </section>
    ) : (
      <section className="pcGalleryEmpty">
        <div className="pcEmptyIllustration">
          <span />
          <i />
        </div>
        <h2>Sua bancada ainda está vazia</h2>
        <p>
          Ligue a primeira montagem para registrar o resultado nesta galeria.
        </p>
        <button
          type="button"
          className="pcInstallButton"
          onClick={onStartBuild}
        >
          Começar primeira montagem
        </button>
      </section>
    )}
  </main>
);
