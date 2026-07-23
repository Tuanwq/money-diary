Add-Type -AssemblyName System.Drawing

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$publicRoot = Join-Path $projectRoot "public"
$iconsRoot = Join-Path $publicRoot "icons"
$normalSizes = @(48, 72, 96, 128, 144, 152, 180, 192, 384, 512)

New-Item -ItemType Directory -Force -Path $iconsRoot | Out-Null

function New-RoundedPath {
  param(
    [float]$X,
    [float]$Y,
    [float]$Width,
    [float]$Height,
    [float]$Radius
  )

  $diameter = $Radius * 2
  $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $path.AddArc($X, $Y, $diameter, $diameter, 180, 90)
  $path.AddArc($X + $Width - $diameter, $Y, $diameter, $diameter, 270, 90)
  $path.AddArc(
    $X + $Width - $diameter,
    $Y + $Height - $diameter,
    $diameter,
    $diameter,
    0,
    90
  )
  $path.AddArc($X, $Y + $Height - $diameter, $diameter, $diameter, 90, 90)
  $path.CloseFigure()
  return $path
}

function Save-DayMarkIcon {
  param(
    [int]$Size,
    [string]$OutputPath,
    [switch]$Maskable,
    [switch]$Badge
  )

  $bitmap = [System.Drawing.Bitmap]::new(
    $Size,
    $Size,
    [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
  )
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $graphics.CompositingQuality =
    [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  $graphics.Clear([System.Drawing.Color]::Transparent)

  if ($Badge) {
    $scale = $Size / 96.0
    $check = [System.Drawing.Pen]::new(
      [System.Drawing.Color]::FromArgb(255, 255, 255, 255),
      14 * $scale
    )
    $check.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $check.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $check.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
    $graphics.DrawLines(
      $check,
      [System.Drawing.PointF[]]@(
        [System.Drawing.PointF]::new(20 * $scale, 50 * $scale),
        [System.Drawing.PointF]::new(40 * $scale, 70 * $scale),
        [System.Drawing.PointF]::new(76 * $scale, 30 * $scale)
      )
    )

    $check.Dispose()
  } else {
    $scale = $Size / 512.0
    $background = [System.Drawing.SolidBrush]::new(
      [System.Drawing.Color]::FromArgb(255, 49, 92, 107)
    )
    $surface = [System.Drawing.SolidBrush]::new(
      [System.Drawing.Color]::FromArgb(255, 247, 247, 242)
    )
    $divider = [System.Drawing.SolidBrush]::new(
      [System.Drawing.Color]::FromArgb(255, 184, 204, 210)
    )
    $brand = [System.Drawing.Color]::FromArgb(255, 85, 122, 91)

    $graphics.FillRectangle($background, 0, 0, $Size, $Size)

    if ($Maskable) {
      $bodyX = 120
      $bodyY = 132
      $bodyWidth = 272
      $bodyHeight = 266
      $bodyRadius = 46
      $ringLeft = 190
      $ringRight = 322
      $ringTop = 102
      $ringHeight = 62
      $dividerY = 190
      $dividerHeight = 20
      $checkPoints = @(
        [System.Drawing.PointF]::new(174 * $scale, 286 * $scale),
        [System.Drawing.PointF]::new(226 * $scale, 338 * $scale),
        [System.Drawing.PointF]::new(342 * $scale, 218 * $scale)
      )
      $checkWidth = 32 * $scale
    } else {
      $bodyX = 88
      $bodyY = 112
      $bodyWidth = 336
      $bodyHeight = 310
      $bodyRadius = 58
      $ringLeft = 170
      $ringRight = 342
      $ringTop = 80
      $ringHeight = 76
      $dividerY = 188
      $dividerHeight = 24
      $checkPoints = @(
        [System.Drawing.PointF]::new(164 * $scale, 294 * $scale),
        [System.Drawing.PointF]::new(228 * $scale, 358 * $scale),
        [System.Drawing.PointF]::new(356 * $scale, 218 * $scale)
      )
      $checkWidth = 38 * $scale
    }

    $body = New-RoundedPath `
      -X ($bodyX * $scale) `
      -Y ($bodyY * $scale) `
      -Width ($bodyWidth * $scale) `
      -Height ($bodyHeight * $scale) `
      -Radius ($bodyRadius * $scale)
    $graphics.FillPath($surface, $body)
    $graphics.FillRectangle(
      $divider,
      $bodyX * $scale,
      $dividerY * $scale,
      $bodyWidth * $scale,
      $dividerHeight * $scale
    )

    $ringWidth = 30 * $scale
    $graphics.FillRectangle(
      $surface,
      ($ringLeft - 15) * $scale,
      $ringTop * $scale,
      $ringWidth,
      $ringHeight * $scale
    )
    $graphics.FillRectangle(
      $surface,
      ($ringRight - 15) * $scale,
      $ringTop * $scale,
      $ringWidth,
      $ringHeight * $scale
    )

    $check = [System.Drawing.Pen]::new($brand, $checkWidth)
    $check.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $check.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $check.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
    $graphics.DrawLines($check, [System.Drawing.PointF[]]$checkPoints)

    $check.Dispose()
    $body.Dispose()
    $brand = $null
    $divider.Dispose()
    $surface.Dispose()
    $background.Dispose()
  }

  $bitmap.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $graphics.Dispose()
  $bitmap.Dispose()
}

foreach ($size in $normalSizes) {
  Save-DayMarkIcon `
    -Size $size `
    -OutputPath (Join-Path $iconsRoot "daymark-$size.png")
}

foreach ($size in @(192, 512)) {
  Save-DayMarkIcon `
    -Size $size `
    -OutputPath (Join-Path $iconsRoot "daymark-maskable-$size.png") `
    -Maskable
}

Save-DayMarkIcon `
  -Size 96 `
  -OutputPath (Join-Path $iconsRoot "daymark-badge-96.png") `
  -Badge

Save-DayMarkIcon `
  -Size 16 `
  -OutputPath (Join-Path $publicRoot "favicon-16x16.png")
Save-DayMarkIcon `
  -Size 32 `
  -OutputPath (Join-Path $publicRoot "favicon-32x32.png")
Save-DayMarkIcon `
  -Size 180 `
  -OutputPath (Join-Path $publicRoot "apple-touch-icon.png")

# Keep app-prefixed aliases for existing installed DayMark builds.
Copy-Item `
  (Join-Path $publicRoot "favicon-16x16.png") `
  (Join-Path $publicRoot "daymark-favicon-16x16.png") `
  -Force
Copy-Item `
  (Join-Path $publicRoot "favicon-32x32.png") `
  (Join-Path $publicRoot "daymark-favicon-32x32.png") `
  -Force
Copy-Item `
  (Join-Path $publicRoot "apple-touch-icon.png") `
  (Join-Path $publicRoot "daymark-apple-touch-icon.png") `
  -Force

Write-Output "Generated DayMark PWA icons from vector geometry."
