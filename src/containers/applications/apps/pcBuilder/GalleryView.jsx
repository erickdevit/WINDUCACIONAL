import React from "react";
import { getPcPart } from "../../../../../server/domain/pcBuilderCatalog.mjs";
import { ComponentArtwork } from "./ComponentArtwork";

const formatDate = (value) =>
  new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));

const BuildCard = ({ build, onDelete, onOpen, index }) => {
  const pcCase = getPcPart(build.components?.case);
  const cpu = getPcPart(build.components?.cpu);
  const gpu = getPcPart(build.components?.gpu);
  const storage = getPcPart(build.components?.storage);
  const success = build.outcome === "success";

  return (
    <article className="pcGalleryCard" data-outcome={build.outcome}>
      <div className="pcGalleryPreview">
        <span className="pcGalleryProjectNumber">
          #{String(index + 1).padStart(2, "0")}
        </span>
        <div className="pcGalleryArtwork">
          <span className="pcGalleryArtCase">
            <ComponentArtwork category="case" part={pcCase} />
          </span>
          <span className="pcGalleryArtGpu">
            <ComponentArtwork category="gpu" part={gpu} />
          </span>
          <span className="pcGalleryArtCpu">
            <ComponentArtwork category="cpu" part={cpu} />
          </span>
        </div>
        <div className="pcGalleryOutcome">
          <i aria-hidden="true">{success ? "✓" : "!"}</i>
          <span>
            <small>Teste de energia</small>
            <strong>{success ? "WINDOWS INICIOU" : "FALHA CRÍTICA"}</strong>
          </span>
        </div>
      </div>
      <div className="pcGalleryCardBody">
        <div className="pcGalleryMeta">
          <span>{success ? "Projeto funcional" : "Projeto para revisar"}</span>
          <time>{formatDate(build.createdAt)}</time>
        </div>
        <h2>{build.name}</h2>
        <div className="pcGalleryPartsSummary">
          <span>
            <ComponentArtwork category="cpu" part={cpu} />
            <small>Processador</small>
            <strong>{cpu?.name || "Ausente"}</strong>
          </span>
          <span>
            <ComponentArtwork category="storage" part={storage} />
            <small>Armazenamento</small>
            <strong>{storage?.name || "Ausente"}</strong>
          </span>
        </div>
        <div className="pcGalleryScore">
          <span>
            <small>Desempenho estimado</small>
            <strong>
              {build.validation?.metrics?.performanceScore || 0}/100
            </strong>
          </span>
          <div>
            <i
              style={{
                width: `${build.validation?.metrics?.performanceScore || 0}%`,
              }}
            />
          </div>
        </div>
        <div className="pcGalleryActions">
          <button type="button" onClick={() => onOpen(build)}>
            <span aria-hidden="true">◇</span>
            Explorar projeto
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
}) => {
  const successfulBuilds = builds.filter(
    (build) => build.outcome === "success"
  ).length;
  const bestScore = builds.reduce(
    (best, build) =>
      Math.max(best, build.validation?.metrics?.performanceScore || 0),
    0
  );

  return (
    <main className="pcGalleryView">
      <section className="pcGalleryHeading">
        <div className="pcGalleryHeadingCopy">
          <span className="pcMissionBadge">
            <i aria-hidden="true">▦</i>
            Arquivo pessoal
          </span>
          <h1>Sua coleção de máquinas.</h1>
          <p>
            Cada projeto guarda as peças, o diagnóstico e o resultado do teste.
            Compare suas escolhas e evolua a próxima montagem.
          </p>
        </div>
        <div className="pcGalleryStats">
          <span>
            <small>Projetos</small>
            <strong>{builds.length}</strong>
          </span>
          <span>
            <small>Funcionando</small>
            <strong>{successfulBuilds}</strong>
          </span>
          <span>
            <small>Melhor score</small>
            <strong>{bestScore}</strong>
          </span>
        </div>
        <button
          type="button"
          className="pcInstallButton"
          onClick={onStartBuild}
        >
          <span aria-hidden="true">+</span>
          <span>
            <small>Nova missão</small>
            <strong>Montar outro PC</strong>
          </span>
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
          <strong>Buscando seus projetos...</strong>
          <small>Abrindo o arquivo pessoal da bancada</small>
        </div>
      ) : builds.length > 0 ? (
        <section className="pcGalleryGrid" aria-label="Computadores salvos">
          {builds.map((build, index) => (
            <BuildCard
              key={build.id}
              build={build}
              index={index}
              onDelete={onDelete}
              onOpen={onOpen}
            />
          ))}
        </section>
      ) : (
        <section className="pcGalleryEmpty">
          <div className="pcEmptyIllustration">
            <ComponentArtwork category="case" />
            <span aria-hidden="true">+</span>
          </div>
          <span className="pcEyebrow">Galeria vazia</span>
          <h2>Sua primeira máquina começa na bancada.</h2>
          <p>
            Escolha as peças, ligue o computador e o projeto aparecerá aqui com
            todo o diagnóstico.
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
};
