$pages = @(
  @{ name = 'home.png'; tab = 'home'; modal = '' },
  @{ name = 'ai.png'; tab = 'ai'; modal = '' },
  @{ name = 'progress.png'; tab = 'progress'; modal = '' },
  @{ name = 'planner.png'; tab = 'planner'; modal = '' },
  @{ name = 'knowledge.png'; tab = 'knowledge'; modal = '' },
  @{ name = 'opportunities.png'; tab = 'opportunities'; modal = '' },
  @{ name = 'auth_connexion.png'; tab = 'home'; modal = 'auth' },
  @{ name = 'settings_parametres.png'; tab = 'home'; modal = 'settings' },
  @{ name = 'diagnostic_ia.png'; tab = 'home'; modal = 'diagnostic' }
)

$baseDir = "c:\Users\djima\Mel projet\Elora\docs\screenshots"

Write-Host "--- Capture Desktop (1280x900) ---"
foreach ($p in $pages) {
  $url = "http://localhost:5173/?tab=" + $p.tab
  if ($p.modal -ne '') { $url += "&modal=" + $p.modal }
  $out = Join-Path $baseDir ("desktop\" + $p.name)
  $cmd = "`"C:\Program Files\Google\Chrome\Application\chrome.exe`" --headless=new --window-size=1280,900 --screenshot=`"$out`" `"$url`""
  cmd.exe /c $cmd
  Write-Host "Desktop captured: $($p.name)"
}

Write-Host "--- Capture Mobile (390x844) ---"
foreach ($p in $pages) {
  $url = "http://localhost:5173/?tab=" + $p.tab
  if ($p.modal -ne '') { $url += "&modal=" + $p.modal }
  $out = Join-Path $baseDir ("mobile\" + $p.name)
  $cmd = "`"C:\Program Files\Google\Chrome\Application\chrome.exe`" --headless=new --window-size=390,844 --screenshot=`"$out`" `"$url`""
  cmd.exe /c $cmd
  Write-Host "Mobile captured: $($p.name)"
}

Write-Host "--- Finished all 18 captures! ---"
