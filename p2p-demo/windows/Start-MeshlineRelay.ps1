$ErrorActionPreference = "Stop"

$relayRoot = Join-Path $PSScriptRoot "meshline-relay-data"
$identityFile = Join-Path $relayRoot "relay.identity"
$relayBinary = Join-Path $PSScriptRoot "meshline-relay.exe"

if (-not (Test-Path $relayBinary)) {
  throw "meshline-relay.exe is missing. Keep this script beside the downloaded relay executable."
}

New-Item -ItemType Directory -Force -Path $relayRoot | Out-Null

Write-Host "Starting the temporary Meshline relay on TCP and UDP port 4020."
Write-Host "It stores no Meshline messages, groups, channels, or account data."
Write-Host "Keep the relay.identity file private and do not send it to anyone."
Write-Host ""

& $relayBinary `
  --port 4020 `
  --run-seconds 0 `
  --identity-file $identityFile `
  --max-reservations 2 `
  --max-reservations-per-peer 1 `
  --reservation-seconds 300 `
  --max-circuits 2 `
  --max-circuits-per-peer 1 `
  --max-circuit-seconds 60 `
  --max-circuit-bytes 65536
