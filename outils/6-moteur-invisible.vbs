' ===================================================================
'  Motiq - lancer le moteur de rendu SANS afficher de fenetre.
'
'  Pourquoi ce detour par VBScript ? Une tache planifiee Windows qui
'  lance un .bat fait clignoter une fenetre noire a chaque execution.
'  Toutes les deux minutes, c'est insupportable.
'
'  WScript.Shell.Run avec le second parametre a 0 lance le programme
'  cache, sans fenetre. Le troisieme parametre (False) rend la main
'  immediatement : la tache planifiee se termine, le rendu continue.
' ===================================================================
Set shell = CreateObject("WScript.Shell")
dossier = Left(WScript.ScriptFullName, InStrRev(WScript.ScriptFullName, "\"))
shell.Run """" & dossier & "5-fabriquer-les-videos.bat""", 0, False
