module Auth
  # Senhas legadas usam scrypt (crypto.scryptSync do Node: N=16384, r=8, p=1,
  # 64 bytes, salt tratado como string). Senhas novas usam bcrypt. No primeiro
  # login bem-sucedido com hash legado, a senha é re-hasheada para bcrypt.
  class PasswordService
    SCRYPT_N = 16_384
    SCRYPT_R = 8
    SCRYPT_P = 1
    SCRYPT_LENGTH = 64

    def self.verify(password, user)
      if user.bcrypt_hash.present?
        BCrypt::Password.new(user.bcrypt_hash) == password.to_s
      else
        verify_scrypt(password, user.password_salt, user.password_hash)
      end
    rescue BCrypt::Errors::InvalidHash
      false
    end

    # Verifica com o hash legado e faz upgrade transparente para bcrypt.
    def self.verify_and_upgrade!(password, user)
      return false unless verify(password, user)

      if user.bcrypt_hash.blank?
        user.update_columns(
          bcrypt_hash: hash_new(password),
          legacy_auth_migrated_at: Time.current
        )
      end
      true
    end

    def self.hash_new(password)
      BCrypt::Password.create(password.to_s).to_s
    end

    # Mantém compatibilidade com usuários criados pelo servidor Node:
    # gera salt + hash scrypt no mesmo formato.
    def self.hash_legacy(password, salt = SecureRandom.hex(16))
      hash = OpenSSL::KDF.scrypt(
        password.to_s, salt: salt,
        N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P, length: SCRYPT_LENGTH
      ).unpack1("H*")
      { salt: salt, hash: hash }
    end

    def self.verify_scrypt(password, salt, expected_hash)
      return false if salt.blank? || expected_hash.blank?
      computed = hash_legacy(password, salt)[:hash]
      ActiveSupport::SecurityUtils.secure_compare(computed, expected_hash)
    rescue OpenSSL::KDF::KDFError
      false
    end
    private_class_method :verify_scrypt
  end
end
