# Limpa o Redis usado por OnlineUserTracker/Typing::PvpLobby entre exemplos,
# já que esse estado vive fora da transação do banco de dados.
RSpec.configure do |config|
  config.before do
    OnlineUserTracker.redis.flushdb
  end
end
