#!/bin/bash

bundle_file="./simulator/lib/bundle.js"
template_index="./simulator/html/index-template.html"
out_index="./index.html"

if command -v md5sum &> /dev/null
then
    md5=$(md5sum "$bundle_file" | cut -f 1 -d ' ')
else
    if command -v md5 &> /dev/null
    then
        md5=$(md5 -r "$bundle_file" | cut -f 1 -d ' ')
    else
        echo "md5 command not found, aborting"
        exit 1
    fi
fi

if [ -z "$md5" ]; then
    echo "Failed to get md5"
    exit 1
fi

cat "$template_index" | sed -e "s/BUNDLE_MD5/$md5/g" > "$out_index"

echo "Updated $(basename "$out_index") with MD5 of $(basename "$bundle_file"): $md5"
