$modals = @(
  'desktop/auth_connexion.png',
  'desktop/settings_parametres.png',
  'desktop/diagnostic_ia.png',
  'mobile/auth_connexion.png',
  'mobile/settings_parametres.png',
  'mobile/diagnostic_ia.png'
)

foreach ($m in $modals) {
  $path = "docs/screenshots/" + $m
  $json = cmd.exe /c "curl.exe -s -F `"file=@$path`" https://tmpfiles.org/api/v1/upload"
  try {
    $res = $json | ConvertFrom-Json
    Write-Host "$m => $($res.data.url)"
  } catch {
    Write-Host "Err for $m : $json"
  }
}
