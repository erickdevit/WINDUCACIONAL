class AdoptLegacySchema < ActiveRecord::Migration[7.2]
  # Adota o schema do servidor Node legado. O SQL baseline é idempotente
  # (IF NOT EXISTS em tudo), então funciona tanto em banco vazio quanto em
  # banco existente compartilhado com o servidor Express durante a transição.
  def up
    execute File.read(Rails.root.join("db", "baseline", "0001_baseline.sql"))
  end

  def down
    raise ActiveRecord::IrreversibleMigration
  end
end
