module Filesystem
  # Disco virtual por usuário persistido em JSON, no mesmo layout do servidor
  # Node (data/users/<storage_key>/disk.json e config.json), compartilhável
  # com o sistema legado durante a transição.
  class UserDiskService
    def self.data_dir
      Rails.application.config.x.data_dir
    end

    def self.user_dir(storage_key)
      File.join(data_dir, "users", storage_key.to_s)
    end

    def self.disk_path(storage_key)
      File.join(user_dir(storage_key), "disk.json")
    end

    def self.config_path(storage_key)
      File.join(user_dir(storage_key), "config.json")
    end

    def self.ensure_disk(user)
      FileUtils.mkdir_p(user_dir(user.storage_key))
      path = disk_path(user.storage_key)
      File.write(path, JSON.generate(default_home_data)) unless File.exist?(path)
    end

    def self.read_home(user, current_username)
      ensure_disk(user)
      data = JSON.parse(File.read(disk_path(user.storage_key)))
      info = { icon: "user" }
      info[:spid] = "%user%" if user.username == current_username
      { type: "folder", name: user.username, info: info, data: data }
    end

    def self.write_home(user, data)
      ensure_disk(user)
      File.write(disk_path(user.storage_key), JSON.generate(data || {}))
    end

    def self.load_config(storage_key)
      JSON.parse(File.read(config_path(storage_key)))
    rescue Errno::ENOENT, JSON::ParserError
      nil
    end

    def self.save_config(user, config)
      FileUtils.mkdir_p(user_dir(user.storage_key))
      File.write(config_path(user.storage_key), JSON.generate(config || {}))
    end

    def self.default_home_data
      {
        "Desktop" => { "info" => { "spid" => "%desktop%", "icon" => "desk" } },
        "Documents" => {
          "info" => { "spid" => "%documents%", "icon" => "docs" },
          "data" => { "Cenários" => {}, "Anotações" => {} }
        },
        "Downloads" => { "info" => { "spid" => "%downloads%", "icon" => "down" } },
        "Music" => { "info" => { "spid" => "%music%", "icon" => "music" } },
        "Pictures" => { "info" => { "spid" => "%pictures%", "icon" => "pics" } },
        "Videos" => { "info" => { "spid" => "%videos%", "icon" => "vid" } },
        "OneDrive" => {
          "type" => "folder", "name" => "OneDrive",
          "info" => { "spid" => "%onedrive%", "icon" => "onedrive" }
        }
      }
    end
  end
end
