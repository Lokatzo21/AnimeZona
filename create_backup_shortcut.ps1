$shell = New-Object -ComObject WScript.Shell
$desktopPaths = @(
    "C:\Users\manue\OneDrive\Desktop",
    "C:\Users\manue\Desktop"
)

$sourceProject = "C:\Users\manue\OneDrive\Documentos\Anime"
$targetBat = "$sourceProject\Hacer-Respaldo-Supabase.bat"

foreach ($desktop in $desktopPaths) {
    if (Test-Path $desktop) {
        $sc = $shell.CreateShortcut((Join-Path $desktop "Respaldar Supabase.lnk"))
        $sc.TargetPath = $targetBat
        $sc.WorkingDirectory = $sourceProject
        $sc.Description = "Respaldo Completo en 1 Clic de Supabase (Guarda en M:\BD STREAMING) - StreamZona"
        $sc.IconLocation = "imageres.dll,23"
        $sc.Save()

        Write-Output "Acceso directo creado con éxito en: $desktop\Respaldar Supabase.lnk"
    }
}
