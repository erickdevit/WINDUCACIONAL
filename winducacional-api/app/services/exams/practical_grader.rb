module Exams
  # Equivalente a normalizeValidationRules, findSnapshotPath e
  # gradePracticalRules do servidor Node (server/index.cjs).
  class PracticalGrader
    RULE_TYPES = %w[FILE_EXISTS FILE_CONTAINS ACTION_PERFORMED].freeze

    def self.normalize_validation_rules(rules)
      return [] unless rules.is_a?(Array)

      rules.filter_map do |rule|
        hash = rule.is_a?(ActionController::Parameters) ? rule.to_unsafe_h : rule
        next unless hash.is_a?(Hash)

        hash = hash.stringify_keys
        type = hash["type"].to_s.strip.upcase
        next unless RULE_TYPES.include?(type)

        {
          "type" => type,
          "path" => hash["path"].to_s.strip,
          "content" => hash["content"].to_s,
          "name" => hash["name"].to_s.strip
        }
      end.first(20)
    end

    # Avalia as regras de validação de uma questão prática contra o snapshot
    # do sistema de arquivos enviado pelo aluno.
    def self.grade(rules, practical_snapshot)
      normalized_rules = normalize_validation_rules(rules)
      return false if normalized_rules.empty?

      snapshot = practical_snapshot.is_a?(ActionController::Parameters) ? practical_snapshot.to_unsafe_h : practical_snapshot
      snapshot = snapshot.is_a?(Hash) ? snapshot.deep_stringify_keys : {}

      file_tree = snapshot["files"].is_a?(Hash) ? snapshot["files"] : {}
      actions = snapshot["actions"].is_a?(Array) ? snapshot["actions"] : []

      normalized_rules.all? do |rule|
        case rule["type"]
        when "FILE_EXISTS"
          find_snapshot_path(file_tree, rule["path"]).present?
        when "FILE_CONTAINS"
          item = find_snapshot_path(file_tree, rule["path"])
          item.is_a?(Hash) && item["type"] != "folder" &&
            item["data"].is_a?(String) && item["data"].include?(rule["content"])
        when "ACTION_PERFORMED"
          actions.any? { |action| action.is_a?(Hash) && action["name"] == rule["name"] }
        else
          false
        end
      end
    end

    def self.find_snapshot_path(tree, cpath)
      return nil unless tree.is_a?(Hash) && cpath.present?

      segments = cpath.to_s.split("\\").map { |segment| segment.strip.downcase }.reject(&:blank?)
      return nil if segments.empty?

      root_key = tree.keys.find { |key| key.to_s.downcase == segments[0] }
      return nil unless root_key

      current = tree[root_key]

      segments[1..].each do |segment|
        children = current.is_a?(Hash) ? current["data"] : nil
        return nil unless children.is_a?(Hash)

        child_key = children.keys.find { |key| key.to_s.downcase == segment }
        return nil unless child_key

        current = children[child_key]
      end

      current
    end
  end
end
