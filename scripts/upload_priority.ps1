$files = @(
  'desktop/home.png',
  'desktop/ai.png',
  'desktop/progress.png',
  'desktop/planner.png',
  'desktop/knowledge.png',
  'desktop/opportunities.png',
  'mobile/home.png',
  'mobile/ai.png',
  'mobile/progress.png',
  'mobile/planner.png',
  'mobile/knowledge.png',
  'mobile/opportunities.png'
)
foreach ($f in $files) {
  $path = "docs/screenshots/" + $f
  $json = cmd.exe /c "curl.exe -s -F `"file=@$path`" https://tmpfiles.org/api/v1/upload"
  try {
    $res = $json | ConvertFrom-Json
    Write-Host "$f => $($res.data.url)"
  } catch {
    Write-Host "Failed to parse for $f : $json"
  }
}
