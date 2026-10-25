$shell = New-Object -ComObject WScript.Shell
$desktopPaths = @(
    "C:\Users\manue\OneDrive\Desktop",
    "C:\Users\manue\Desktop"
)

$sourceProject = "C:\Users\manue\OneDrive\Documentos\Anime"
$targetBat = "$sourceProject\Convertir-SoloLatino.bat"

foreach ($desktop in $desktopPaths) {
    if (Test-Path $desktop) {
        # 1. Convertir SoloLatino.lnk
        $sc1 = $shell.CreateShortcut((Join-Path $desktop "Convertir SoloLatino.lnk"))
        $sc1.TargetPath = $targetBat
        $sc1.WorkingDirectory = $sourceProject
        $sc1.Description = "Convertidor Inteligente de Links de SoloLatino (Mediafire) - AnimeZona"
        $sc1.IconLocation = "imageres.dll,28"
        $sc1.Save()

        # 2. Convertidor SoloLatino.lnk
        $sc2 = $shell.CreateShortcut((Join-Path $desktop "Convertidor SoloLatino.lnk"))
        $sc2.TargetPath = $targetBat
        $sc2.WorkingDirectory = $sourceProject
        $sc2.Description = "Convertidor Inteligente de Links de SoloLatino (Mediafire) - AnimeZona"
        $sc2.IconLocation = "imageres.dll,28"
        $sc2.Save()

        Write-Output "Accesos directos de SoloLatino creados con exito en: $desktop"
    }
}
