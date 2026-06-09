# Sincroniza a versão de build do app em app_metadata; quando a versão muda,
# todas as sessões são invalidadas (mesmo comportamento do Node).
class AppVersionService
  KEY = "app_build_version".freeze

  def self.sync!
    version = build_version
    ActiveRecord::Base.transaction do
      current = AppMetadata.lock.find_by(key: KEY)
      if current && current.value != version
        Session.delete_all
        Rails.logger.info("Sessões resetadas após alteração da versão do app.")
      end
      record = current || AppMetadata.new(key: KEY)
      record.update!(value: version, updated_at: Time.current)
    end
    version
  end

  def self.build_version
    ENV.fetch("APP_BUILD_VERSION") do
      manifest = Rails.root.join("..", "build", "manifest.json")
      File.exist?(manifest) ? Digest::SHA256.file(manifest).hexdigest[0, 12] : "dev"
    end
  end
end
