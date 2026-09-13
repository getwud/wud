job "multi-app" {
  datacenters = ["dc1"]
  type        = "service"

  group "cache" {
    count = 1

    task "redis" {
      driver = "docker"

      config {
        image = "redis:7.0.0"
      }

      meta = {
        "wud.display.name" = "Nomad Redis"
      }
    }
  }
}
