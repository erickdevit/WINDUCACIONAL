module Api
  # Apostilas em PDF: catálogo com permissões, liberação global e por aluno,
  # e download autenticado. Portado de server/routes/booklets.cjs.
  class BookletsController < ApplicationController
    include Authenticatable
    include ProfessorRequired

    skip_before_action :require_professor!, only: %i[modules pdf]

    def modules
      catalog = Booklets::CatalogService.catalog_with_access(current_user)
      visible = current_user.role != "aluno" ? catalog : catalog.select { |mod| mod[:enabled] }
      render json: { modules: visible.map { |mod| Booklets::CatalogService.public_module(mod) } }
    end

    def update_access
      enabled_ids = Array(params[:enabledModuleIds]).map(&:to_s)
      catalog = Booklets::CatalogService.build_catalog
      known_ids = catalog.map { |mod| mod[:id] }.to_set

      if enabled_ids.any? { |id| !known_ids.include?(id) }
        return render json: { error: "Módulo de apostila inválido." }, status: :bad_request
      end

      enabled_set = enabled_ids.to_set
      ActiveRecord::Base.transaction do
        catalog.each do |mod|
          record = BookletModuleAccess.find_or_initialize_by(module_id: mod[:id])
          record.update!(enabled: enabled_set.include?(mod[:id]), updated_at: Time.current)
        end
      end

      updated = Booklets::CatalogService.catalog_with_access
      render json: { modules: updated.map { |mod| Booklets::CatalogService.public_module(mod) } }
    end

    def student_access
      render json: { students: Booklets::CatalogService.list_student_access(params[:turmaId].to_s) }
    end

    def update_student_access
      user_ids = Array(params[:userIds]).map(&:to_s).uniq
      module_ids = Array(params[:moduleIds]).map(&:to_s).uniq
      turma_id = params[:turmaId].to_s

      if user_ids.empty?
        return render json: { error: "Selecione pelo menos um aluno." }, status: :bad_request
      end

      known_ids = Booklets::CatalogService.build_catalog.map { |mod| mod[:id] }.to_set
      if module_ids.any? { |id| !known_ids.include?(id) }
        return render json: { error: "Módulo de apostila inválido." }, status: :bad_request
      end

      valid_count = User.active.alunos.where(id: user_ids).count
      if valid_count != user_ids.length
        return render json: { error: "Aluno inválido." }, status: :bad_request
      end

      ActiveRecord::Base.transaction do
        BookletStudentModuleAccess.where(user_id: user_ids).delete_all
        user_ids.each do |user_id|
          module_ids.each do |module_id|
            BookletStudentModuleAccess.create!(
              module_id: module_id, user_id: user_id, enabled: true,
              created_at: Time.current, updated_at: Time.current
            )
          end
        end
      end

      render json: { students: Booklets::CatalogService.list_student_access(turma_id) }
    end

    def pdf
      result = Booklets::CatalogService.find_file(params[:module_id], params[:file_id], current_user)
      mod = result[:module]
      file = result[:file]

      unless mod && file
        return render json: { error: "Apostila não encontrada." }, status: :not_found
      end

      if current_user.role != "professor" && !mod[:enabled]
        return render json: { error: "Esta apostila ainda não foi liberada para alunos." }, status: :forbidden
      end

      response.headers["X-Content-Type-Options"] = "nosniff"
      response.headers["Cache-Control"] = "private, max-age=300"
      send_file file[:absolutePath],
        type: "application/pdf",
        disposition: "inline",
        filename: file[:fileName]
    end
  end
end
