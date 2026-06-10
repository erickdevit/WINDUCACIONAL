# Auxiliares de coerção que reproduzem a semântica do JavaScript usada pelo
# servidor Node legado (ex.: Boolean(value)) ao interpretar o corpo JSON.
module JsValueHelpers
  private

  # Equivalente a Boolean(value) do JavaScript: apenas null/undefined, false,
  # 0 e string vazia são falsos.
  def js_truthy?(value)
    ![nil, false, 0, ""].include?(value)
  end
end
