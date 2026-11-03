#!/usr/bin/env bash
set -euo pipefail

environment_name=${1:?Usage: bioinformatics_wrapper.sh ENVIRONMENT [COMMAND [ARG ...]]}
shift
manager=${BIOINFORMATICS_ENV_MANAGER:-micromamba}

if [[ "$environment_name" == "__bundled__" ]]; then
  exec "$@"
fi

if [[ "$environment_name" == "fastq_quality" ]]; then
  if [[ "${manager##*/}" == micromamba* ]]; then
    exec "$manager" run -n "$environment_name" fastqc "$@"
  fi
  exec "$manager" run --no-capture-output -n "$environment_name" fastqc "$@"
fi

if [[ "${manager##*/}" == micromamba* ]]; then
  exec "$manager" run -n "$environment_name" "$@"
fi

exec "$manager" run --no-capture-output -n "$environment_name" "$@"
