# Bloqueia chamadas HTTP reais nos testes (proxy de geração de imagens e
# edge proxy usam Faraday para falar com serviços externos).
require "webmock/rspec"

WebMock.disable_net_connect!(allow_localhost: true)
