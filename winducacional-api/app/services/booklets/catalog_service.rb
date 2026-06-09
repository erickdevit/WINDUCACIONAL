module Booklets
  # Catálogo de apostilas em PDF lido do diretório da biblioteca, com IDs
  # estáveis e controle de acesso global e por aluno. Portado de index.cjs.
  class CatalogService
    def self.library_dir
      Rails.application.config.x.booklet_library_dir
    end

    def self.normalize_id(value)
      normalized = value.to_s.unicode_normalize(:nfd)
        .gsub(/[̀-ͯ]/, "")
        .downcase
        .gsub(/[^a-z0-9]+/, "-")
        .gsub(/\A-+|-+\z/, "")
      normalized.presence || "item"
    end

    def self.title_for(value)
      value.to_s.sub(/\.pdf\z/i, "").sub(/\A\d+\s*-\s*/, "").strip
    end

    def self.order_for(value)
      match = value.to_s.match(/\A(\d+)/)
      match ? match[1].to_i : 0
    end

    def self.compare_names(a, b)
      # Ordenação numérica natural equivalente ao localeCompare pt-BR
      a.to_s.split(/(\d+)/).map { |part| part.match?(/\A\d+\z/) ? part.to_i : part.downcase } <=>
        b.to_s.split(/(\d+)/).map { |part| part.match?(/\A\d+\z/) ? part.to_i : part.downcase }
    end

    def self.build_catalog
      return [] unless Dir.exist?(library_dir)

      used_module_ids = Set.new
      modules = []

      module_dirs = Dir.children(library_dir)
        .select { |name| File.directory?(File.join(library_dir, name)) }
        .sort { |a, b| compare_names(a, b) }

      module_dirs.each do |dir_name|
        module_path = File.join(library_dir, dir_name)
        module_id = unique_id(normalize_id(dir_name), dir_name, used_module_ids)
        used_module_ids << module_id

        used_file_ids = Set.new
        files = Dir.children(module_path)
          .select { |name| name.downcase.end_with?(".pdf") && File.file?(File.join(module_path, name)) }
          .sort { |a, b| compare_names(a, b) }
          .map do |file_name|
            file_id = unique_id(normalize_id(file_name), file_name, used_file_ids)
            used_file_ids << file_id
            file_path = File.join(module_path, file_name)
            {
              id: file_id,
              title: title_for(file_name),
              fileName: file_name,
              order: order_for(file_name),
              size: File.size(file_path),
              url: "/api/booklets/modules/#{ERB::Util.url_encode(module_id)}/files/#{ERB::Util.url_encode(file_id)}/pdf",
              absolutePath: file_path
            }
          end

        next if files.empty?

        modules << {
          id: module_id,
          title: title_for(dir_name),
          folderName: dir_name,
          order: order_for(dir_name),
          totalFiles: files.length,
          files: files
        }
      end

      modules
    end

    def self.catalog_with_access(user = nil)
      modules = build_catalog
      return [] if modules.empty?

      module_ids = modules.map { |mod| mod[:id] }
      global_map = BookletModuleAccess.where(module_id: module_ids)
        .pluck(:module_id, :enabled).to_h

      student_map = {}
      if user&.role == "aluno"
        student_map = BookletStudentModuleAccess
          .where(user_id: user.id, module_id: module_ids)
          .pluck(:module_id, :enabled).to_h
      end

      modules.map do |mod|
        mod.merge(
          globalEnabled: global_map[mod[:id]] == true,
          studentEnabled: student_map[mod[:id]] == true,
          enabled: global_map[mod[:id]] == true || student_map[mod[:id]] == true
        )
      end
    end

    def self.find_file(module_id, file_id, user = nil)
      modules = catalog_with_access(user)
      mod = modules.find { |item| item[:id] == module_id }
      return { module: nil, file: nil } unless mod
      { module: mod, file: mod[:files].find { |item| item[:id] == file_id } }
    end

    # Remove absolutePath do payload público.
    def self.public_module(mod, include_files: true)
      safe = mod.except(:absolutePath)
      safe[:files] = include_files ? mod[:files].map { |file| file.except(:absolutePath) } : []
      safe
    end

    def self.list_student_access(turma_id = "")
      binds = []
      turma_filter = ""
      if turma_id.present?
        binds << turma_id
        turma_filter = "AND u.turma_id = $1"
      end

      rows = ActiveRecord::Base.connection.exec_query(
        <<~SQL.squish, "booklet_student_access", binds
          SELECT u.id, u.username, u.display_name, u.turma_id,
                 t.nome AS turma_nome,
                 COALESCE(
                   ARRAY_REMOVE(ARRAY_AGG(bsma.module_id ORDER BY bsma.module_id), NULL),
                   ARRAY[]::TEXT[]
                 ) AS module_ids
          FROM users u
          LEFT JOIN turmas t ON t.id = u.turma_id
          LEFT JOIN booklet_student_module_access bsma
            ON bsma.user_id = u.id AND bsma.enabled = TRUE
          WHERE u.role = 'aluno' AND u.active = TRUE #{turma_filter}
          GROUP BY u.id, u.username, u.display_name, u.turma_id, t.nome
          ORDER BY t.nome ASC NULLS LAST, u.display_name ASC, u.username ASC
        SQL
      )

      rows.map do |student|
        module_ids = student["module_ids"]
        module_ids = module_ids.to_s.delete("{}").split(",").reject(&:blank?) unless module_ids.is_a?(Array)
        {
          id: student["id"],
          username: student["username"],
          displayName: student["display_name"],
          turmaId: student["turma_id"],
          turmaNome: student["turma_nome"] || "Sem turma",
          moduleIds: module_ids
        }
      end
    end

    def self.unique_id(base, original_name, used)
      return base unless used.include?(base)
      "#{base}-#{Digest::SHA1.hexdigest(original_name)[0, 6]}"
    end
    private_class_method :unique_id
  end
end
