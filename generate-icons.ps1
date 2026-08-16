<#
  Gera os ícones do PWA (icons/*.png) usando System.Drawing (GDI+), sem
  depender de Node/Python/ImageMagick. Rode uma vez com:
    powershell -NoProfile -ExecutionPolicy Bypass -File generate-icons.ps1
  Só precisa rodar de novo se quiser trocar o design do ícone.
#>

Add-Type -AssemblyName System.Drawing

function New-AppIcon {
  param(
    [int]$Size,
    [string]$OutPath,
    [double]$TextScale = 0.42
  )

  $bmp = New-Object System.Drawing.Bitmap $Size, $Size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic

  $bg = [System.Drawing.ColorTranslator]::FromHtml("#1f5f8b")
  $g.Clear($bg)

  # Faixa inferior discreta (verde) para dar um leve toque de identidade sem poluir.
  $accent = [System.Drawing.ColorTranslator]::FromHtml("#2f7a4f")
  $stripeHeight = [Math]::Max(2, [int]($Size * 0.06))
  $accentBrush = New-Object System.Drawing.SolidBrush $accent
  $g.FillRectangle($accentBrush, 0, $Size - $stripeHeight, $Size, $stripeHeight)

  $text = "MF"
  $fontSize = [Math]::Max(6, [int]($Size * $TextScale))
  $font = New-Object System.Drawing.Font("Segoe UI", $fontSize, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  $whiteBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
  $format = New-Object System.Drawing.StringFormat
  $format.Alignment = [System.Drawing.StringAlignment]::Center
  $format.LineAlignment = [System.Drawing.StringAlignment]::Center

  $rect = New-Object System.Drawing.RectangleF(0, ($Size * -0.03), $Size, $Size)
  $g.DrawString($text, $font, $whiteBrush, $rect, $format)

  $g.Dispose()

  $dir = Split-Path $OutPath -Parent
  if ($dir -and -not (Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }

  $bmp.Save($OutPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  Write-Host "Gerado: $OutPath ($Size x $Size)"
}

# Ícones normais ("any"): conteúdo ocupa quase todo o quadro.
New-AppIcon -Size 192 -OutPath "icons/icon-192.png" -TextScale 0.42
New-AppIcon -Size 512 -OutPath "icons/icon-512.png" -TextScale 0.42

# Ícones "maskable": o SO pode recortar em círculo/rounded-square, então o
# conteúdo importante fica só nos ~80% centrais (zona segura).
New-AppIcon -Size 192 -OutPath "icons/icon-maskable-192.png" -TextScale 0.30
New-AppIcon -Size 512 -OutPath "icons/icon-maskable-512.png" -TextScale 0.30

# iOS aplica seu próprio arredondamento — ícone precisa vir quadrado, sem cantos cortados.
New-AppIcon -Size 180 -OutPath "icons/apple-touch-icon.png" -TextScale 0.42

# Favicon (aba do navegador).
New-AppIcon -Size 32 -OutPath "icons/favicon-32.png" -TextScale 0.46
New-AppIcon -Size 16 -OutPath "icons/favicon-16.png" -TextScale 0.5

Write-Host "Concluído."
