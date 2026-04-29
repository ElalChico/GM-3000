$f = 'c:\Users\elalc\Downloads\gm-2000 (1)\src\App.tsx'
$content = [System.IO.File]::ReadAllText($f, [System.Text.Encoding]::UTF8)

$oldCode = @'
    setMoveFrom("");
    setViewingMoveIndex(null);
    setIsLoadedPgn(false);
  };
'@

$newCode = @'
    setMoveFrom("");
    setViewingMoveIndex(null);
    setIsLoadedPgn(false);

    // Si habia una partida activa, re-disparar los motores despues del reset
    // para que la IA vuelva a jugar inmediatamente (maquina vs maquina / humano vs maquina)
    if (hasStartedRef.current) {
      whiteTimeRef.current = initialTimeMin * 60;
      blackTimeRef.current = initialTimeMin * 60;
      setTimeout(() => {
        triggerEngine(g);
      }, 200);
    }
  };
'@

if ($content.Contains($oldCode)) {
  $newContent = $content.Replace($oldCode, $newCode)
  [System.IO.File]::WriteAllText($f, $newContent, [System.Text.Encoding]::UTF8)
  Write-Output "SUCCESS: resetGame patched"
}
else {
  Write-Output "ERROR: target string not found"
  # Debug: show the area
  $idx = $content.IndexOf("setMoveFrom")
  Write-Output "Found setMoveFrom at index: $idx"
}
