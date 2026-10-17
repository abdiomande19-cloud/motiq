' ===================================================================
'  Motiq - lancer l'application sans afficher de fenetre.
'
'  Meme principe que pour le moteur : WScript.Shell.Run avec 0 en
'  second parametre lance le programme cache. Sans cela, une fenetre
'  noire s'ouvre a chaque connexion Windows.
' ===================================================================
Set shell = CreateObject("WScript.Shell")
dossier = Left(WScript.ScriptFullName, InStrRev(WScript.ScriptFullName, "\"))
shell.Run """" & dossier & "7-demarrer-l-application.bat""", 0, False
