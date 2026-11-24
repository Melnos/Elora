$files = @(
  'desktop/home.png',
  'desktop/ai.png',
  'desktop/progress.png',
  'mobile/home.png',
  'mobile/ai.png',
  'mobile/progress.png'
)
foreach ($f in $files) {
  $path = "docs/screenshots/" + $f
  $json = cmd.exe /c "curl.exe -s -F `"file=@$path`" https://tmpfiles.org/api/v1/upload"
  try {
    $res = $json | ConvertFrom-Json
    $directUrl = $res.data.url -replace "https://tmpfiles.org/", "https://tmpfiles.org/dl/"
    Write-Host "$f => $($res.data.url) (Direct: $directUrl)"
  } catch {
    Write-Host "Failed to parse for $f : $json"
  }
}
