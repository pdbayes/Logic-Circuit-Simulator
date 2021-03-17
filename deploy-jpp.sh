#!/bin/bash

src_folder=$(dirname "$0")

host="ua898908.serversignin.com"
port="8228"
username="ua898908"
target_path="/home/ua898908/public_html/jp.pellet.name/hep/logiga"

rsync -avzcP -e "ssh -p $port" --exclude .git "$src_folder" "$username@$host:$target_path"
