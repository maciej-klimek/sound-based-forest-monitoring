#!/usr/bin/env bash

COUNT=50

MIN_LAT=50.030
MAX_LAT=50.090
MIN_LON=19.890
MAX_LON=19.990

# Initialize RNG only once
SEED=$(date +%s)
RANDOM=$SEED

rand_range() {
    # returns float between min and max
    echo "$(awk -v min="$1" -v max="$2" -v r="$RANDOM" 'BEGIN {
        print min + (max-min)*(r/32767);
    }')"
}

echo "[" > sensors.json

for ((i=1; i<=COUNT; i++)); do
    LAT=$(rand_range $MIN_LAT $MAX_LAT)
    LON=$(rand_range $MIN_LON $MAX_LON)

    if [[ $i -lt $COUNT ]]; then
        echo "  { \"id\": $i, \"latitude\": $LAT, \"longitude\": $LON }," >> sensors.json
    else
        echo "  { \"id\": $i, \"latitude\": $LAT, \"longitude\": $LON }" >> sensors.json
    fi

    # Refresh randomness each iteration
    RANDOM=$(( RANDOM * 1103515245 + 12345 ))
done

echo "]" >> sensors.json

echo "Generated sensors.json with $COUNT random sensors in wide range!"
