$allFiles = @(
  'desktop/home.png',
  'desktop/ai.png',
  'desktop/progress.png',
  'desktop/planner.png',
  'desktop/knowledge.png',
  'desktop/opportunities.png',
  'desktop/auth_connexion.png',
  'desktop/settings_parametres.png',
  'desktop/diagnostic_ia.png',
  'mobile/home.png',
  'mobile/ai.png',
  'mobile/progress.png',
  'mobile/planner.png',
  'mobile/knowledge.png',
  'mobile/opportunities.png',
  'mobile/auth_connexion.png',
  'mobile/settings_parametres.png',
  'mobile/diagnostic_ia.png'
)

$results = @{}
foreach ($f in $allFiles) {
  $path = "docs/screenshots/" + $f
  $json = cmd.exe /c "curl.exe -s -F `"file=@$path`" https://tmpfiles.org/api/v1/upload"
  try {
    $res = $json | ConvertFrom-Json
    $directUrl = $res.data.url -replace "https://tmpfiles.org/", "https://tmpfiles.org/dl/"
    Write-Host "$f => $($res.data.url)"
  } catch {
    Write-Host "Err: $f"
  }
}
