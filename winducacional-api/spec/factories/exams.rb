FactoryBot.define do
  factory :exam do
    id { SecureRandom.uuid }
    sequence(:title) { |n| "Prova #{n}" }
    description { "" }
    container_initial_state { {} }
    time_limit { 0 }
    is_published { false }
    active { true }
    turma { nil }
  end

  factory :exam_question do
    id { SecureRandom.uuid }
    exam
    type { "mcq" }
    text { "Qual a resposta correta?" }
    options { [ "a", "b", "c", "d" ] }
    correct_answer { "a" }
    validation_rules { [] }
    points { 1 }
    time_limit { 0 }
    order_index { 0 }

    trait :practical do
      type { "practical" }
      options { [] }
      correct_answer { nil }
      validation_rules { [ { "type" => "FILE_EXISTS", "path" => "C:\\arquivo.txt", "content" => "", "name" => "" } ] }
    end
  end

  factory :exam_assignment do
    id { SecureRandom.uuid }
    exam
    user
  end

  factory :exam_submission do
    id { SecureRandom.uuid }
    exam
    user
    status { "in_progress" }
    score_mcq { 0 }
    score_practical { 0 }
    total_score { 0 }
    student_display_name { "" }
  end

  factory :exam_answer do
    id { SecureRandom.uuid }
    exam_submission
    exam_question
    answer_text { nil }
    is_correct { false }
    points_awarded { 0 }
  end

  factory :exam_application_batch do
    id { SecureRandom.uuid }
    mode { "all" }
    total_requested { 0 }
    total_created { 0 }
    total_existing { 0 }
    total_skipped { 0 }
    total_removed { 0 }
    total_retained { 0 }
    cancellation_reason { "" }
  end

  factory :exam_application_item do
    id { SecureRandom.uuid }
    exam_application_batch
    exam { nil }
    user { nil }
    status { "created" }
    removal_status { "active" }
    removal_reason { "" }
    reason { "" }
  end
end
