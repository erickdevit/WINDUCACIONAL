import React, { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { AppWindow } from "../../../../components/shared/AppWindow";
import { api } from "../../../../lib/api";
import { validatePcBuild } from "../../../../../server/domain/pcBuilderRules.mjs";
import { BuilderView } from "./BuilderView";
import { GalleryView } from "./GalleryView";
import { PartCatalogModal } from "./PartCatalogModal";
import { PowerResultModal } from "./PowerResultModal";
import { BuildDetailsModal } from "./BuildDetailsModal";
import { DeleteBuildModal } from "./DeleteBuildModal";
import "./pcBuilder.scss";

const createDefaultName = (user) =>
  user?.name && user.name !== "Usuário"
    ? `PC de ${user.name}`
    : "Meu computador";

export const PcBuilder = () => {
  const wnapp = useSelector((state) => state.apps.pcBuilder);
  const user = useSelector((state) => state.setting.person);
  const [activeView, setActiveView] = useState("builder");
  const [selection, setSelection] = useState({});
  const [buildName, setBuildName] = useState(() => createDefaultName(user));
  const [activeCategory, setActiveCategory] = useState(null);
  const [powerResult, setPowerResult] = useState(null);
  const [selectedBuild, setSelectedBuild] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [builds, setBuilds] = useState([]);
  const [loadingGallery, setLoadingGallery] = useState(false);
  const [saving, setSaving] = useState(false);
  const [galleryError, setGalleryError] = useState("");

  const evaluation = useMemo(() => validatePcBuild(selection), [selection]);

  const loadGallery = async () => {
    setLoadingGallery(true);
    setGalleryError("");
    try {
      const result = await api.getPcBuilds();
      setBuilds(result.builds || []);
    } catch (error) {
      setGalleryError(error.message);
    } finally {
      setLoadingGallery(false);
    }
  };

  useEffect(() => {
    if (!wnapp?.hide && activeView === "gallery") loadGallery();
  }, [wnapp?.hide, activeView]);

  useEffect(() => {
    if (user?.name && buildName === "Meu computador") {
      setBuildName(createDefaultName(user));
    }
  }, [user?.name]);

  if (!wnapp) return null;

  const handleSelectPart = (category, partId) => {
    setSelection((current) => ({ ...current, [category]: partId }));
    setActiveCategory(null);
  };

  const handlePowerOn = async () => {
    if (saving) return;
    setSaving(true);
    const fallbackResult = {
      id: null,
      name: buildName.trim() || "Computador sem nome",
      components: evaluation.selection,
      outcome: evaluation.outcome,
      validation: {
        errors: evaluation.errors,
        warnings: evaluation.warnings,
        metrics: evaluation.metrics,
      },
      createdAt: new Date().toISOString(),
    };

    try {
      const result = await api.savePcBuild({
        name: buildName.trim() || "Computador sem nome",
        components: evaluation.selection,
      });
      setPowerResult(result.build);
      setBuilds((current) => [
        result.build,
        ...current.filter((build) => build.id !== result.build.id),
      ]);
    } catch (error) {
      setPowerResult({ ...fallbackResult, persistError: error.message });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSelection({});
    setBuildName(createDefaultName(user));
  };

  const handleDelete = async () => {
    if (!pendingDelete || saving) return;
    setSaving(true);
    try {
      await api.deletePcBuild(pendingDelete.id);
      setBuilds((current) =>
        current.filter((build) => build.id !== pendingDelete.id)
      );
      if (selectedBuild?.id === pendingDelete.id) setSelectedBuild(null);
      setPendingDelete(null);
    } catch (error) {
      setGalleryError(error.message);
      setPendingDelete(null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppWindow
      wnapp={wnapp}
      app={wnapp.action}
      icon={wnapp.icon}
      name="Montagem de PC"
      className="pcBuilderWindow darkWindow"
      windowScreenClassName="flex flex-col"
      restWindowClassName="flex-grow flex flex-col"
    >
      <div className="pcBuilderApp">
        <header className="pcBuilderTopbar">
          <div className="pcBuilderBrand">
            <span className="pcBuilderBrandMark" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            <span>
              <strong>PC LAB</strong>
              <small>Construa. Teste. Ligue.</small>
            </span>
          </div>
          <nav aria-label="Navegação do app Montagem de PC">
            <button
              type="button"
              className={activeView === "builder" ? "active" : ""}
              onClick={() => setActiveView("builder")}
            >
              <span aria-hidden="true">◇</span>
              <span>
                <strong>Montagem</strong>
                <small>Bancada interativa</small>
              </span>
            </button>
            <button
              type="button"
              className={activeView === "gallery" ? "active" : ""}
              onClick={() => setActiveView("gallery")}
            >
              <span aria-hidden="true">▦</span>
              <span>
                <strong>Galeria</strong>
                <small>Seus projetos</small>
              </span>
              {builds.length > 0 && <i>{builds.length}</i>}
            </button>
          </nav>
          <div className="pcBuilderTopStatus">
            <span className="pcBuilderSync">
              <i aria-hidden="true" />
              <span>
                <small>PROJETO AO VIVO</small>
                <strong>{Object.keys(selection).length}/10 peças</strong>
              </span>
            </span>
            <div className="pcBuilderUser">
              <span aria-hidden="true">
                {(user?.name || "A").charAt(0).toUpperCase()}
              </span>
              <span>
                <small>Montador</small>
                <strong>{user?.name || "Aluno"}</strong>
              </span>
            </div>
          </div>
        </header>

        {activeView === "builder" ? (
          <BuilderView
            buildName={buildName}
            evaluation={evaluation}
            saving={saving}
            selection={selection}
            onBuildNameChange={setBuildName}
            onOpenCategory={setActiveCategory}
            onPowerOn={handlePowerOn}
            onReset={handleReset}
          />
        ) : (
          <GalleryView
            builds={builds}
            error={galleryError}
            loading={loadingGallery}
            onDelete={setPendingDelete}
            onOpen={setSelectedBuild}
            onRefresh={loadGallery}
            onStartBuild={() => setActiveView("builder")}
          />
        )}
      </div>

      {activeCategory && (
        <PartCatalogModal
          category={activeCategory}
          selection={selection}
          onClose={() => setActiveCategory(null)}
          onSelect={handleSelectPart}
        />
      )}
      {powerResult && (
        <PowerResultModal
          build={powerResult}
          onClose={() => setPowerResult(null)}
          onOpenGallery={() => {
            setPowerResult(null);
            setActiveView("gallery");
          }}
        />
      )}
      {selectedBuild && (
        <BuildDetailsModal
          build={selectedBuild}
          onClose={() => setSelectedBuild(null)}
          onDelete={() => {
            setPendingDelete(selectedBuild);
            setSelectedBuild(null);
          }}
        />
      )}
      {pendingDelete && (
        <DeleteBuildModal
          build={pendingDelete}
          deleting={saving}
          onCancel={() => setPendingDelete(null)}
          onConfirm={handleDelete}
        />
      )}
    </AppWindow>
  );
};
