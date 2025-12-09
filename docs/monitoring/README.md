# Monitoring

## HealthCheck

WUD exposes an endpoint to check the service healthiness.

### Endpoint
The healthiness is exposed at [/health](http://localhost:3000/health).

If the application is healthy, the Http Response Status Code is `200` (`500` otherwise).

### Example
```json
{
  "uptime": 123
}
```

You can use it to configure health checks performed by your container orchestrator, for example:

```yaml
services:

  whatsupdocker:
    image: getwud/wud:7.2.0
    ...
    healthcheck:
      test: curl --fail http://localhost:${WUD_SERVER_PORT:-3000}/health || exit 1
      interval: 10s
      timeout: 10s
      retries: 3
      start_period: 10s
```


## Prometheus metrics
![logo](prometheus.png)

WUD exposes various metrics that [Prometheus](https://prometheus.io/) can scrape.

### Configuration

| Env var                  | Required       | Description               | Supported values | Default value when missing |
| ------------------------ | :------------: | ------------------------- | ---------------- | -------------------------- |
| `WUD_PROMETHEUS_ENABLED` | :white_circle: | If Metrics must be exposed | `true`, `false`  | `true`                     |

### Endpoint
The metrics are exposed at [/metrics](http://localhost:3000/metrics).

### Metrics

#### WUD specific metrics
```bash

# HELP wud_containers The watched containers
# TYPE wud_containers gauge
wud_containers{id="8a787a1bb3fdf9cfcfc3fe73abcb714655b6232049b9b61c31252b1df59066d8",name="homeassistant",watcher="local",include_tags="^\\d+\\.\\d+.\\d+$",image_id="sha256:d4a6fafb7d4da37495e5c9be3242590be24a87d7edcc4f79761098889c54fca6",image_registry_url="https://registry-1.docker.io/v2",image_registry_name="hub",image_name="homeassistant/home-assistant",image_tag_value="2021.6.4",image_tag_semver="true",image_digest_watch="false",image_digest_repo="sha256:ca0edc3fb0b4647963629bdfccbb3ccfa352184b45a9b4145832000c2878dd72",image_architecture="amd64",image_os="linux",image_created="2021-06-12T05:33:38.440Z",result_tag="2021.6.5",update_available="true"} 1
wud_containers{id="f653ec203d78d36b087c537226589e48f8af4a0899488c0d6a9e0beacbe9604e",name="nginx",watcher="local",image_id="sha256:d1a364dc548d5357f0da3268c888e1971bbdb957ee3f028fe7194f1d61c6fdee",image_registry_url="https://registry-1.docker.io/v2",image_registry_name="hub",image_name="library/nginx",image_tag_value="latest",image_tag_semver="false",image_digest_watch="true",image_digest_repo="sha256:6d75c99af15565a301e48297fa2d121e15d80ad526f8369c526324f0f7ccb750",image_digest_value="sha256:61191087790c31e43eb37caa10de1135b002f10c09fdda7fa8a5989db74033aa",image_architecture="amd64",image_os="linux",image_created="2021-05-25T15:43:43.382Z",result_tag="latest",result_digest="sha256:61191087790c31e43eb37caa10de1135b002f10c09fdda7fa8a5989db74033aa",update_available="false"} 1
wud_containers{id="0ca61f4adc859eb9cbb90bfb1b66bae0c78451c364df9b84a1859006da03d7dc",name="pihole",watcher="local",include_tags="^\\d+\\.\\d+.\\d+$",exclude_tags="undefined",image_id="sha256:eb777ee00e0c6ea00a2bbdc273a06b57acf232a4fd5495ce70ab94346550cea0",image_registry_url="https://registry-1.docker.io/v2",image_registry_name="hub",image_name="pihole/pihole",image_tag_value="v5.7",image_tag_semver="true",image_digest_watch="false",image_digest_repo="sha256:3a39992f3e0879a4705d87d0b059513af0749e6ea2579744653fe54ceae360a0",image_architecture="amd64",image_os="linux",image_variant="undefined",image_created="2021-02-16T23:37:05.436Z",result_tag="v5.7",update_available="false"} 1
wud_containers{id="387ef114a1096a16e643058793ce86cee3e062586907bc5b9f8b1d62b1aad42f",name="portainer",watcher="local",include_tags="^\\d+\\.\\d+.\\d+-alpine$",image_id="sha256:ae2a1948dd22ecbee4aac30564064416ace33629cf3028598d4e132d9c091fd0",image_registry_url="https://registry-1.docker.io/v2",image_registry_name="hub",image_name="portainer/portainer-ce",image_tag_value="2.5.0-alpine",image_tag_semver="true",image_digest_watch="false",image_digest_repo="sha256:e73d6096d4ef9d6f1d88df821ac3ec99cb2227d7778b123b1f417e18d2d013c8",image_architecture="amd64",image_os="linux",image_created="2021-05-23T21:04:34.891Z",result_tag="2.5.1-alpine",update_available="true"} 1
wud_containers{id="ee084217c982f67255e438020128312be1f41ccad5af5c572d8c913cd10e1f66",name="pyload",watcher="local",include_tags="^latest$",exclude_tags="undefined",image_id="sha256:dd54794e01d18d33f8efb3eef99774d915e307e1508987bb999fdb0f8d33019e",image_registry_url="https://registry-1.docker.io/v2",image_registry_name="hub",image_name="writl/pyload",image_tag_value="latest",image_tag_semver="false",image_digest_watch="false",image_digest_repo="sha256:55a0efec296fae88c5fa21dfbda3bfc51635ee1c824e41c4f866fc42b9f42a15",image_architecture="amd64",image_os="linux",image_variant="undefined",image_created="2021-01-10T18:07:48.691Z",result_tag="latest",update_available="false"} 1
wud_containers{id="8baa7e6537b4a2c477bbc49ad1b0efa6bd1484a2c6ecdd7284f370df6f39eb75",name="traefik",watcher="local",include_tags="^\\d+\\.\\d+.\\d+$",exclude_tags="undefined",image_id="sha256:da4c4921aee8ad7a7f66870bb726a8fa4d18f9b0b927ab1ef572e06be5241d65",image_registry_url="https://registry-1.docker.io/v2",image_registry_name="hub",image_name="library/traefik",image_tag_value="2.4.5",image_tag_semver="true",image_digest_watch="false",image_digest_repo="sha256:062dff1b5c54845f34147e04a251a645f3a5318c42da7127bf25a6e0d3c6e4d5",image_architecture="amd64",image_os="linux",image_variant="undefined",image_created="2021-02-25T03:23:47.339Z",result_tag="2.4.8",update_available="true"} 1

# HELP wud_registry_response The Registry response time (in second)
# TYPE wud_registry_response summary
wud_registry_response{quantile="0.01",type="hub",name="hub"} 0.628
wud_registry_response{quantile="0.05",type="hub",name="hub"} 0.6284
wud_registry_response{quantile="0.5",type="hub",name="hub"} 0.863
wud_registry_response{quantile="0.9",type="hub",name="hub"} 1.0332999999999999
wud_registry_response{quantile="0.95",type="hub",name="hub"} 1.0444
wud_registry_response{quantile="0.99",type="hub",name="hub"} 1.046
wud_registry_response{quantile="0.999",type="hub",name="hub"} 1.046
wud_registry_response_sum{type="hub",name="hub"} 14.61
wud_registry_response_count{type="hub",name="hub"} 18

# HELP wud_trigger_count Total count of trigger events
# TYPE wud_trigger_count counter
wud_trigger_count{type="mock",name="example",status="success"} 1

# HELP wud_watcher_total The number of watched containers
# TYPE wud_watcher_total gauge
wud_watcher_total{type="docker",name="local"} 6
```

#### Standard process metrics
```bash
# HELP process_cpu_user_seconds_total Total user CPU time spent in seconds.
# TYPE process_cpu_user_seconds_total counter
process_cpu_user_seconds_total 0.43806500000000004

# HELP process_cpu_system_seconds_total Total system CPU time spent in seconds.
# TYPE process_cpu_system_seconds_total counter
process_cpu_system_seconds_total 0.049822

# HELP process_cpu_seconds_total Total user and system CPU time spent in seconds.
# TYPE process_cpu_seconds_total counter
process_cpu_seconds_total 0.48788699999999996

# HELP process_start_time_seconds Start time of the process since unix epoch in seconds.
# TYPE process_start_time_seconds gauge
process_start_time_seconds 1601627305

# HELP process_resident_memory_bytes Resident memory size in bytes.
# TYPE process_resident_memory_bytes gauge
process_resident_memory_bytes 74395648

# HELP process_virtual_memory_bytes Virtual memory size in bytes.
# TYPE process_virtual_memory_bytes gauge
process_virtual_memory_bytes 950431744

# HELP process_heap_bytes Process heap size in bytes.
# TYPE process_heap_bytes gauge
process_heap_bytes 116568064

# HELP process_open_fds Number of open file descriptors.
# TYPE process_open_fds gauge
process_open_fds 22

# HELP process_max_fds Maximum number of open file descriptors.
# TYPE process_max_fds gauge
process_max_fds 1048576
```

#### Standard Node.js metrics
```bash
# HELP nodejs_eventloop_lag_seconds Lag of event loop in seconds.
# TYPE nodejs_eventloop_lag_seconds gauge
nodejs_eventloop_lag_seconds 0.013967205

# HELP nodejs_eventloop_lag_min_seconds The minimum recorded event loop delay.
# TYPE nodejs_eventloop_lag_min_seconds gauge
nodejs_eventloop_lag_min_seconds 0.000086912

# HELP nodejs_eventloop_lag_max_seconds The maximum recorded event loop delay.
# TYPE nodejs_eventloop_lag_max_seconds gauge
nodejs_eventloop_lag_max_seconds 0.508821503

# HELP nodejs_eventloop_lag_mean_seconds The mean of the recorded event loop delays.
# TYPE nodejs_eventloop_lag_mean_seconds gauge
nodejs_eventloop_lag_mean_seconds 0.012621618267074414

# HELP nodejs_eventloop_lag_stddev_seconds The standard deviation of the recorded event loop delays.
# TYPE nodejs_eventloop_lag_stddev_seconds gauge
nodejs_eventloop_lag_stddev_seconds 0.02283534676636928

# HELP nodejs_eventloop_lag_p50_seconds The 50th percentile of the recorded event loop delays.
# TYPE nodejs_eventloop_lag_p50_seconds gauge
nodejs_eventloop_lag_p50_seconds 0.010715135

# HELP nodejs_eventloop_lag_p90_seconds The 90th percentile of the recorded event loop delays.
# TYPE nodejs_eventloop_lag_p90_seconds gauge
nodejs_eventloop_lag_p90_seconds 0.013647871

# HELP nodejs_eventloop_lag_p99_seconds The 99th percentile of the recorded event loop delays.
# TYPE nodejs_eventloop_lag_p99_seconds gauge
nodejs_eventloop_lag_p99_seconds 0.023576575

# HELP nodejs_active_handles Number of active libuv handles grouped by handle type. Every handle type is C++ class name.
# TYPE nodejs_active_handles gauge
nodejs_active_handles{type="Pipe"} 1
nodejs_active_handles{type="Socket"} 3
nodejs_active_handles{type="WriteStream"} 1
nodejs_active_handles{type="Server"} 1

# HELP nodejs_active_handles_total Total number of active handles.
# TYPE nodejs_active_handles_total gauge
nodejs_active_handles_total 6

# HELP nodejs_active_requests Number of active libuv requests grouped by request type. Every request type is C++ class name.
# TYPE nodejs_active_requests gauge

# HELP nodejs_active_requests_total Total number of active requests.
# TYPE nodejs_active_requests_total gauge
nodejs_active_requests_total 0

# HELP nodejs_heap_size_total_bytes Process heap size from Node.js in bytes.
# TYPE nodejs_heap_size_total_bytes gauge
nodejs_heap_size_total_bytes 26259456

# HELP nodejs_heap_size_used_bytes Process heap size used from Node.js in bytes.
# TYPE nodejs_heap_size_used_bytes gauge
nodejs_heap_size_used_bytes 24616000

# HELP nodejs_external_memory_bytes Node.js external memory size in bytes.
# TYPE nodejs_external_memory_bytes gauge
nodejs_external_memory_bytes 1738842

# HELP nodejs_heap_space_size_total_bytes Process heap space size total from Node.js in bytes.
# TYPE nodejs_heap_space_size_total_bytes gauge
nodejs_heap_space_size_total_bytes{space="read_only"} 151552
nodejs_heap_space_size_total_bytes{space="new"} 1048576
nodejs_heap_space_size_total_bytes{space="old"} 19542016
nodejs_heap_space_size_total_bytes{space="code"} 622592
nodejs_heap_space_size_total_bytes{space="map"} 1576960
nodejs_heap_space_size_total_bytes{space="large_object"} 3268608
nodejs_heap_space_size_total_bytes{space="code_large_object"} 49152
nodejs_heap_space_size_total_bytes{space="new_large_object"} 0

# HELP nodejs_heap_space_size_used_bytes Process heap space size used from Node.js in bytes.
# TYPE nodejs_heap_space_size_used_bytes gauge
nodejs_heap_space_size_used_bytes{space="read_only"} 150392
nodejs_heap_space_size_used_bytes{space="new"} 1036360
nodejs_heap_space_size_used_bytes{space="old"} 18851160
nodejs_heap_space_size_used_bytes{space="code"} 350112
nodejs_heap_space_size_used_bytes{space="map"} 979272
nodejs_heap_space_size_used_bytes{space="large_object"} 3251736
nodejs_heap_space_size_used_bytes{space="code_large_object"} 2880
nodejs_heap_space_size_used_bytes{space="new_large_object"} 0

# HELP nodejs_heap_space_size_available_bytes Process heap space size available from Node.js in bytes.
# TYPE nodejs_heap_space_size_available_bytes gauge
nodejs_heap_space_size_available_bytes{space="read_only"} 0
nodejs_heap_space_size_available_bytes{space="new"} 11064
nodejs_heap_space_size_available_bytes{space="old"} 526680
nodejs_heap_space_size_available_bytes{space="code"} 230304
nodejs_heap_space_size_available_bytes{space="map"} 595064
nodejs_heap_space_size_available_bytes{space="large_object"} 0
nodejs_heap_space_size_available_bytes{space="code_large_object"} 0
nodejs_heap_space_size_available_bytes{space="new_large_object"} 1047424

# HELP nodejs_version_info Node.js version info.
# TYPE nodejs_version_info gauge
nodejs_version_info{version="v14.11.0",major="14",minor="11",patch="0"} 1

# HELP nodejs_gc_duration_seconds Garbage collection duration by kind, one of major, minor, incremental or weakcb.
# TYPE nodejs_gc_duration_seconds histogram
nodejs_gc_duration_seconds_bucket{le="0.001",kind="incremental"} 5
nodejs_gc_duration_seconds_bucket{le="0.01",kind="incremental"} 5
nodejs_gc_duration_seconds_bucket{le="0.1",kind="incremental"} 5
nodejs_gc_duration_seconds_bucket{le="1",kind="incremental"} 6
nodejs_gc_duration_seconds_bucket{le="2",kind="incremental"} 6
nodejs_gc_duration_seconds_bucket{le="5",kind="incremental"} 6
nodejs_gc_duration_seconds_bucket{le="+Inf",kind="incremental"} 6
nodejs_gc_duration_seconds_sum{kind="incremental"} 0.12669281899999998
nodejs_gc_duration_seconds_count{kind="incremental"} 6
nodejs_gc_duration_seconds_bucket{le="0.001",kind="major"} 0
nodejs_gc_duration_seconds_bucket{le="0.01",kind="major"} 3
nodejs_gc_duration_seconds_bucket{le="0.1",kind="major"} 3
nodejs_gc_duration_seconds_bucket{le="1",kind="major"} 3
nodejs_gc_duration_seconds_bucket{le="2",kind="major"} 3
nodejs_gc_duration_seconds_bucket{le="5",kind="major"} 3
nodejs_gc_duration_seconds_bucket{le="+Inf",kind="major"} 3
nodejs_gc_duration_seconds_sum{kind="major"} 0.01499841
nodejs_gc_duration_seconds_count{kind="major"} 3
nodejs_gc_duration_seconds_bucket{le="0.001",kind="minor"} 1
nodejs_gc_duration_seconds_bucket{le="0.01",kind="minor"} 1
nodejs_gc_duration_seconds_bucket{le="0.1",kind="minor"} 1
nodejs_gc_duration_seconds_bucket{le="1",kind="minor"} 1
nodejs_gc_duration_seconds_bucket{le="2",kind="minor"} 1
nodejs_gc_duration_seconds_bucket{le="5",kind="minor"} 1
nodejs_gc_duration_seconds_bucket{le="+Inf",kind="minor"} 1
nodejs_gc_duration_seconds_sum{kind="minor"} 0.0005726689999999999
nodejs_gc_duration_seconds_count{kind="minor"} 1
nodejs_gc_duration_seconds_bucket{le="0.001",kind="weakcb"} 1
nodejs_gc_duration_seconds_bucket{le="0.01",kind="weakcb"} 1
nodejs_gc_duration_seconds_bucket{le="0.1",kind="weakcb"} 1
nodejs_gc_duration_seconds_bucket{le="1",kind="weakcb"} 1
nodejs_gc_duration_seconds_bucket{le="2",kind="weakcb"} 1
nodejs_gc_duration_seconds_bucket{le="5",kind="weakcb"} 1
nodejs_gc_duration_seconds_bucket{le="+Inf",kind="weakcb"} 1
nodejs_gc_duration_seconds_sum{kind="weakcb"} 4.94e-7
nodejs_gc_duration_seconds_count{kind="weakcb"} 1
```

## Grafana
![logo](grafana.png)

You can use [Grafana](https://grafana.com/) to display charts and graphs using the Prometheus metrics.

### Example dashboards

A ready-to-use overview dashboard can be found under `grafana/overview.json`.

It can be imported into any Grafana instance, just pick an existing data source.
An interactive preview of the dashboard can be found
[here](https://theforge.grafana.net/dashboard/snapshot/FskV8Lgi41VwD6jnSPnJxzLzz6B42QZF).

### Watched images
You can also display WUD watched images on Grafana.

#### Example to display the container Table

![image](./grafana_table.png)

```bash
sum by(image_registry_url, image_name, image_os, image_architecture, image_tag_value, result_tag) (wud_containers)

# or if you want to display images to be updated only 
sum by(image_registry_url, image_name, image_os, image_architecture, image_tag_value, result_tag) (wud_containers{update_available="true"})
```
