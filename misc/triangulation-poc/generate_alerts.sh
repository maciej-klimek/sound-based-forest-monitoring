#!/usr/bin/env bash

mkdir -p alerts

declare -A alerts

# group 1 17:01–17:05
alerts["1701000060"]='{"id":1,"sensor_id":1,"timestamp":"2025-10-08T17:01:00Z","distance":400}'
alerts["1701000180"]='{"id":2,"sensor_id":2,"timestamp":"2025-10-08T17:03:00Z","distance":300}'
alerts["1701000240"]='{"id":3,"sensor_id":3,"timestamp":"2025-10-08T17:04:00Z","distance":500}'

# group 2 17:30–17:36
alerts["1701030000"]='{"id":4,"sensor_id":2,"timestamp":"2025-10-08T17:30:00Z","distance":600}'
alerts["1701030180"]='{"id":5,"sensor_id":3,"timestamp":"2025-10-08T17:33:00Z","distance":250}'
alerts["1701030360"]='{"id":6,"sensor_id":4,"timestamp":"2025-10-08T17:36:00Z","distance":700}'

# group 3 18:00–18:05
alerts["1701060000"]='{"id":7,"sensor_id":3,"timestamp":"2025-10-08T18:00:00Z","distance":450}'
alerts["1701060180"]='{"id":8,"sensor_id":4,"timestamp":"2025-10-08T18:03:00Z","distance":550}'
alerts["1701060360"]='{"id":9,"sensor_id":5,"timestamp":"2025-10-08T18:05:00Z","distance":300}'

for file in "${!alerts[@]}"; do
  echo "${alerts[$file]}" > "alerts/${file}.json"
  echo "Created alerts/${file}.json"
done