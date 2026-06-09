FactoryBot.define do
  factory :user do
    id { SecureRandom.uuid }
    sequence(:username) { |n| "usuario#{n}" }
    display_name { "Usuário De Teste" }
    role { "aluno" }
    student_type { "normal" }
    password_salt { "salt" }
    password_hash { "hash" }
    bcrypt_hash { BCrypt::Password.create("SenhaForte123").to_s }
    storage_key { id }
    active { true }

    trait :professor do
      role { "professor" }
    end

    trait :secretaria do
      role { "secretaria" }
    end

    trait :kids do
      student_type { "kids" }
    end
  end

  factory :turma do
    id { SecureRandom.uuid }
    sequence(:nome) { |n| "Turma #{n}" }
    code { Turma.generate_code }
    student_type { "normal" }
    descricao { "" }
    active { true }
  end
end
