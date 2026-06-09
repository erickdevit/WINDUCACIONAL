module Auth
  # Criação de usuário com as mesmas regras do createUser do Node:
  # username normalizado de 3 a 32 caracteres, papel válido, student_type
  # resolvido pela turma, senha mínima e disco virtual inicial.
  class UserCreator
    USERNAME_FORMAT = /\A[a-z0-9._-]{3,32}\z/

    def self.create!(username:, display_name:, role:, password:,
                     student_type: "normal", turma_id: nil, allow_short_password: false)
      normalized = User.normalize_username(username)
      unless normalized.match?(USERNAME_FORMAT)
        raise ApiError.new(
          "Usuário deve ter de 3 a 32 caracteres e usar apenas letras, números, ponto, hífen ou sublinhado.", 400
        )
      end
      raise ApiError.new("Já existe um usuário com esse nome.", 409) if User.exists?(username: normalized)
      raise ApiError.new("Grupo inválido.", 400) unless User::ROLES.include?(role)

      resolved_type = resolve_student_type(role: role, student_type: student_type, turma_id: turma_id)

      min_length = allow_short_password ? 5 : 8
      if password.to_s.length < min_length
        raise ApiError.new("Senha deve ter pelo menos 8 caracteres.", 400)
      end

      legacy = Auth::PasswordService.hash_legacy(password)
      id = SecureRandom.uuid
      user = User.create!(
        id: id,
        username: normalized,
        display_name: User.normalize_display_name(display_name.presence || normalized),
        role: role,
        student_type: resolved_type,
        password_salt: legacy[:salt],
        password_hash: legacy[:hash],
        bcrypt_hash: Auth::PasswordService.hash_new(password),
        legacy_auth_migrated_at: Time.current,
        storage_key: id,
        turma_id: role == "aluno" ? turma_id : nil
      )
      Filesystem::UserDiskService.ensure_disk(user)
      user
    rescue ActiveRecord::RecordNotUnique
      raise ApiError.new("Já existe um usuário com esse nome.", 409)
    end

    def self.resolve_student_type(role:, student_type:, turma_id:)
      return "normal" unless role == "aluno"

      if turma_id.present?
        turma = Turma.find_by(id: turma_id)
        raise ApiError.new("Turma não encontrada.", 400) unless turma
        return turma.student_type
      end

      normalized = student_type.to_s.strip.downcase.presence || "normal"
      unless User::STUDENT_TYPES.include?(normalized)
        raise ApiError.new("Tipo de aluno inválido.", 400)
      end
      normalized
    end
  end
end
