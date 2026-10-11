Option Explicit
Dim WshShell, FSO, RootDir, BatCmd
Set WshShell = CreateObject("WScript.Shell")
Set FSO     = CreateObject("Scripting.FileSystemObject")
RootDir = FSO.GetParentFolderName(WScript.ScriptFullName)
WshShell.CurrentDirectory = RootDir
BatCmd = "cmd.exe /K """ & RootDir & "\_subir_servidor.bat"""
WshShell.Run BatCmd, 1, False
WScript.Echo "Servidor lancado em janela separada!" & vbCrLf & _
             "Aguarde 'Ready in ...ms' e abra: http://localhost:3000" & vbCrLf & _
             "Admin: admin@camara.gov.br / admin123"
