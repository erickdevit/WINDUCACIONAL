# Auxiliares para consultas SQL com parâmetros posicionais ($1, $2, ...),
# usados para reproduzir queries com joins/subqueries do servidor Node.
module RawSql
  extend ActiveSupport::Concern

  private

  def exec_all(sql, binds = [])
    ActiveRecord::Base.connection.exec_query(sql, "exams", binds).to_a
  end

  def exec_one(sql, binds = [])
    exec_all(sql, binds).first
  end

  # exec_query devolve colunas jsonb como texto JSON cru.
  def parse_jsonb(value)
    value.is_a?(String) ? JSON.parse(value) : value
  end
end
