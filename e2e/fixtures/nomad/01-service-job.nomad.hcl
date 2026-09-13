job "web-service" {
  datacenters = ["dc1"]
  type        = "service"

  meta = {
    "wud.stack" = "nomad-demo"
  }

  group "frontend" {
    count = 1

    task "nginx" {
      driver = "docker"

      config {
        image = "nginx:1.27.0"
      }

      meta = {
        "wud.watch"        = "true"
        "wud.tag.include"  = "^1\\.27"
        "wud.display.name" = "Nomad Nginx"
      }
    }
  }
}
