job "batch-job" {
  datacenters = ["dc1"]
  type        = "batch"

  meta = {
    "wud.watch" = "false"
  }

  group "worker" {
    count = 1

    task "busybox" {
      driver = "docker"

      config {
        image = "busybox:1.36.0"
      }
    }
  }
}
