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
$chrome = "C:\Program Files\Google\Chrome\Application\chrome.exe"

# 1. Official Mobile (390x844)
Write-Host "=== 1. Capturing Official Mobile (390x844) ==="
foreach ($p in $pages) {
  $url = "http://localhost:5173/?tab=" + $p.tab
  if ($p.modal -ne '') { $url += "&modal=" + $p.modal }
  $out = Join-Path $baseDir ("mobile\" + $p.name)
  $cmd = "`"$chrome`" --headless=new --window-size=390,844 --screenshot=`"$out`" `"$url`""
  cmd.exe /c $cmd
  Write-Host "Mobile captured: $($p.name)"
}

# 2. Official Desktop (1440x900)
Write-Host "=== 2. Capturing Official Desktop (1440x900) ==="
foreach ($p in $pages) {
  $url = "http://localhost:5173/?tab=" + $p.tab
  if ($p.modal -ne '') { $url += "&modal=" + $p.modal }
  $out = Join-Path $baseDir ("desktop\" + $p.name)
  $cmd = "`"$chrome`" --headless=new --window-size=1440,900 --screenshot=`"$out`" `"$url`""
  cmd.exe /c $cmd
  Write-Host "Desktop captured: $($p.name)"
}

# 3. Viewport Verification tests (360x800, 430x932, 768x1024, 1280x800)
$testDir = "c:\Users\djima\Mel projet\Elora\docs\screenshots\tests"
if (!(Test-Path $testDir)) { New-Item -ItemType Directory -Path $testDir -Force | Out-Null }

$viewports = @(
  @{ name = "360x800"; w = 360; h = 800 },
  @{ name = "430x932"; w = 430; h = 932 },
  @{ name = "768x1024"; w = 768; h = 1024 },
  @{ name = "1280x800"; w = 1280; h = 800 }
)

Write-Host "=== 3. Testing across responsive viewports ==="
foreach ($vp in $viewports) {
  $out = Join-Path $testDir ("home_" + $vp.name + ".png")
  $cmd = "`"$chrome`" --headless=new --window-size=$($vp.w),$($vp.h) --screenshot=`"$out`" `"http://localhost:5173/?tab=home`""
  cmd.exe /c $cmd
  Write-Host "Viewport $($vp.name) validated: home_$($vp.name).png"
}

Write-Host "=== All Viewport Validations & Screenshots Complete! ==="
