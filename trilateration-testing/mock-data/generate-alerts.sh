#!/usr/bin/env bash
mkdir -p alerts
declare -A alerts

alerts["1701000001"]='{"id":1,"sensor_id":3,"timestamp":"2025-10-08T17:00:01Z","distance":420}'
alerts["1701000005"]='{"id":2,"sensor_id":17,"timestamp":"2025-10-08T17:00:05Z","distance":380}'
alerts["1701000010"]='{"id":3,"sensor_id":44,"timestamp":"2025-10-08T17:00:10Z","distance":510}'
alerts["1701000015"]='{"id":4,"sensor_id":12,"timestamp":"2025-10-08T17:00:15Z","distance":330}'
alerts["1701000020"]='{"id":5,"sensor_id":28,"timestamp":"2025-10-08T17:00:20Z","distance":600}'
alerts["1701000025"]='{"id":6,"sensor_id":9,"timestamp":"2025-10-08T17:00:25Z","distance":450}'
alerts["1701000030"]='{"id":7,"sensor_id":31,"timestamp":"2025-10-08T17:00:30Z","distance":300}'
alerts["1701000035"]='{"id":8,"sensor_id":46,"timestamp":"2025-10-08T17:00:35Z","distance":350}'
alerts["1701000040"]='{"id":9,"sensor_id":15,"timestamp":"2025-10-08T17:00:40Z","distance":520}'
alerts["1701000045"]='{"id":10,"sensor_id":7,"timestamp":"2025-10-08T17:00:45Z","distance":390}'

alerts["1701000050"]='{"id":11,"sensor_id":22,"timestamp":"2025-10-08T17:00:50Z","distance":410}'
alerts["1701000055"]='{"id":12,"sensor_id":1,"timestamp":"2025-10-08T17:00:55Z","distance":280}'
alerts["1701000060"]='{"id":13,"sensor_id":48,"timestamp":"2025-10-08T17:01:00Z","distance":470}'
alerts["1701000065"]='{"id":14,"sensor_id":6,"timestamp":"2025-10-08T17:01:05Z","distance":620}'
alerts["1701000070"]='{"id":15,"sensor_id":38,"timestamp":"2025-10-08T17:01:10Z","distance":340}'
alerts["1701000075"]='{"id":16,"sensor_id":25,"timestamp":"2025-10-08T17:01:15Z","distance":530}'
alerts["1701000080"]='{"id":17,"sensor_id":11,"timestamp":"2025-10-08T17:01:20Z","distance":460}'
alerts["1701000085"]='{"id":18,"sensor_id":50,"timestamp":"2025-10-08T17:01:25Z","distance":310}'
alerts["1701000090"]='{"id":19,"sensor_id":19,"timestamp":"2025-10-08T17:01:30Z","distance":700}'
alerts["1701000095"]='{"id":20,"sensor_id":32,"timestamp":"2025-10-08T17:01:35Z","distance":360}'

alerts["1701000100"]='{"id":21,"sensor_id":13,"timestamp":"2025-10-08T17:01:40Z","distance":480}'
alerts["1701000105"]='{"id":22,"sensor_id":41,"timestamp":"2025-10-08T17:01:45Z","distance":400}'
alerts["1701000110"]='{"id":23,"sensor_id":29,"timestamp":"2025-10-08T17:01:50Z","distance":550}'
alerts["1701000115"]='{"id":24,"sensor_id":4,"timestamp":"2025-10-08T17:01:55Z","distance":600}'
alerts["1701000120"]='{"id":25,"sensor_id":18,"timestamp":"2025-10-08T17:02:00Z","distance":350}'
alerts["1701000125"]='{"id":26,"sensor_id":35,"timestamp":"2025-10-08T17:02:05Z","distance":580}'
alerts["1701000130"]='{"id":27,"sensor_id":40,"timestamp":"2025-10-08T17:02:10Z","distance":300}'
alerts["1701000135"]='{"id":28,"sensor_id":8,"timestamp":"2025-10-08T17:02:15Z","distance":660}'
alerts["1701000140"]='{"id":29,"sensor_id":21,"timestamp":"2025-10-08T17:02:20Z","distance":500}'
alerts["1701000145"]='{"id":30,"sensor_id":5,"timestamp":"2025-10-08T17:02:25Z","distance":390}'

for file in "${!alerts[@]}"; do
  echo "${alerts[$file]}" > "alerts/${file}.json"
done
