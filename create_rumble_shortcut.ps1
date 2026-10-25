$shell = New-Object -ComObject WScript.Shell
$desktopPaths = @(
    "C:\Users\manue\OneDrive\Desktop",
    "C:\Users\manue\Desktop"
)

foreach ($desktop in $desktopPaths) {
    if (Test-Path $desktop) {
        $linkPath = Join-Path $desktop "Convertidor Rumble.lnk"
        $shortcut = $shell.CreateShortcut($linkPath)
        $shortcut.TargetPath = "C:\Users\manue\OneDrive\Documentos\Anime\Convertir-Rumble.bat"
        $shortcut.WorkingDirectory = "C:\Users\manue\OneDrive\Documentos\Anime"
        $shortcut.Description = "Convertidor Inteligente de Links de Rumble - AnimeZona"
        $shortcut.IconLocation = "imageres.dll,28"
        $shortcut.Save()
        Write-Output "Acceso directo creado con exito en: $linkPath"
    }
}
