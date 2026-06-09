class AddBcryptColumnsToUsers < ActiveRecord::Migration[7.2]
  # As senhas legadas usam scrypt (crypto.scryptSync do Node). Senhas novas e
  # senhas re-hasheadas em login bem-sucedido usam bcrypt. A coluna
  # legacy_auth_migrated_at acompanha o progresso da migração dual-hash.
  def change
    add_column :users, :bcrypt_hash, :string unless column_exists?(:users, :bcrypt_hash)
    unless column_exists?(:users, :legacy_auth_migrated_at)
      add_column :users, :legacy_auth_migrated_at, :timestamptz
    end
  end
end
