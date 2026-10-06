#!/bin/bash
cd "$(dirname "$0")" || exit 1
python3 serve.py &
orion_game_server_pid=$!
open "http://127.0.0.1:4173"
wait "$orion_game_server_pid"
