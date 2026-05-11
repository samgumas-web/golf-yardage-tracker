# Quick local server for GolfYards
# Run: .\serve.ps1
# Then open http://localhost:8080 (or your LAN IP) on your phone

$port = 8080
$dir  = $PSScriptRoot

$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Start()

$ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notmatch '^127\.' } | Select-Object -First 1).IPAddress
Write-Host ""
Write-Host "  GolfYards is running!" -ForegroundColor Green
Write-Host ""
Write-Host "  Local:   http://localhost:$port" -ForegroundColor Cyan
if ($ip) {
  Write-Host "  Phone:   http://${ip}:$port  (same Wi-Fi required)" -ForegroundColor Cyan
}
Write-Host ""
Write-Host "  Press Ctrl+C to stop." -ForegroundColor Gray
Write-Host ""

$mimeTypes = @{
  '.html' = 'text/html'
  '.json' = 'application/json'
  '.svg'  = 'image/svg+xml'
  '.js'   = 'application/javascript'
  '.css'  = 'text/css'
}

while ($listener.IsListening) {
  try {
    $ctx  = $listener.GetContext()
    $req  = $ctx.Request
    $resp = $ctx.Response

    $path = $req.Url.LocalPath -replace '/','\'
    if ($path -eq '\') { $path = '\index.html' }
    $file = Join-Path $dir $path.TrimStart('\')

    if (Test-Path $file -PathType Leaf) {
      $ext  = [System.IO.Path]::GetExtension($file)
      $mime = if ($mimeTypes[$ext]) { $mimeTypes[$ext] } else { 'application/octet-stream' }
      $bytes = [System.IO.File]::ReadAllBytes($file)
      $resp.ContentType   = $mime
      $resp.ContentLength64 = $bytes.Length
      $resp.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
      $resp.StatusCode = 404
    }

    $resp.OutputStream.Close()
  } catch [System.Net.HttpListenerException] {
    break
  } catch {
    try { $ctx.Response.StatusCode = 500; $ctx.Response.OutputStream.Close() } catch {}
  }
}
