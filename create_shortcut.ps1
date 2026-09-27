$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut("C:\Users\manue\OneDrive\Desktop\Cerebro Scraper V3.lnk")
$shortcut.TargetPath = "C:\Users\manue\OneDrive\Documentos\Anime\worker_v3.bat"
$shortcut.WorkingDirectory = "C:\Users\manue\OneDrive\Documentos\Anime"
$shortcut.Save()
