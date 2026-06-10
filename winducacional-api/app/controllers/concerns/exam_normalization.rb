# Auxiliares de normalização equivalentes às funções normalizeExam* e
# normalizeQuestion* do servidor Node (server/index.cjs).
module ExamNormalization
  extend ActiveSupport::Concern

  include JsValueHelpers

  private

  # Equivalente a normalizeExamText: String(value ?? fallback).trim()
  def normalize_exam_text(value, fallback = "")
    (value.nil? ? fallback : value).to_s.strip
  end

  def normalize_exam_time_limit(value)
    clamp_integer(value, 0, 0, 1440)
  end

  def normalize_question_points(value)
    clamp_integer(value, 1, 0, 1000)
  end

  def normalize_exam_question_type(value)
    type = value.to_s.strip.downcase
    raise ApiError.new("Tipo de questão inválido.", 400) unless ExamQuestion::TYPES.include?(type)

    type
  end

  # Equivalente a options.map((option) => String(option || "").trim()).slice(0, 8)
  def normalize_question_options(options)
    return [] unless options.is_a?(Array)

    options.map { |option| js_truthy?(option) ? option.to_s.strip : "" }.first(8)
  end

  def normalize_validation_rules(rules)
    Exams::PracticalGrader.normalize_validation_rules(rules)
  end

  # Converte um parâmetro de corpo JSON (ActionController::Parameters) em Hash puro.
  def normalize_json_param(value)
    return nil if value.nil?

    value.is_a?(ActionController::Parameters) ? value.to_unsafe_h : value
  end

  # Equivalente ao clampInteger do Node (fallback quando não numérico)
  def clamp_integer(value, fallback, min, max)
    parsed = begin
      Float(value)
    rescue ArgumentError, TypeError
      nil
    end
    safe = parsed&.finite? ? parsed.truncate : fallback
    safe.clamp(min, max)
  end
end
