#!/usr/bin/env bash

mkdir -p alerts

declare -A alerts

# do zmiany te grupy bo nielogiczne to sie robi juz XD

alerts["1701000060"]='{"id":1,"sensor_id":1,"timestamp":"2025-10-08T17:01:00Z","distance":600}'
alerts["1701000180"]='{"id":2,"sensor_id":2,"timestamp":"2025-10-08T17:03:00Z","distance":300}'
alerts["1701000240"]='{"id":3,"sensor_id":3,"timestamp":"2025-10-08T17:04:00Z","distance":500}'

alerts["1701020000"]='{"id":4,"sensor_id":6,"timestamp":"2025-10-08T17:02:00Z","distance":330}'
alerts["1701020120"]='{"id":5,"sensor_id":7,"timestamp":"2025-10-08T17:04:00Z","distance":350}'
alerts["1701020240"]='{"id":6,"sensor_id":8,"timestamp":"2025-10-08T17:06:00Z","distance":420}'

alerts["1701050000"]='{"id":7,"sensor_id":9,"timestamp":"2025-10-08T17:05:00Z","distance":300}'
alerts["1701050120"]='{"id":8,"sensor_id":10,"timestamp":"2025-10-08T17:07:00Z","distance":450}'
alerts["1701050240"]='{"id":9,"sensor_id":11,"timestamp":"2025-10-08T17:09:00Z","distance":350}'

for file in "${!alerts[@]}"; do
  echo "${alerts[$file]}" > "alerts/${file}.json"
  echo "Created alerts/${file}.json"
done
