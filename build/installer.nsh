; NSIS custom installer actions for YG Unikalizer

!macro customInstall
  StrCpy $0 "$INSTDIR\YG-Unikalizer.exe"

  WriteRegStr HKLM "Software\Classes\SystemFileAssociations\image\shell\PhotoUnikalizer" "MUIVerb" "Send to PhotoUnikalizer"
  WriteRegStr HKLM "Software\Classes\SystemFileAssociations\image\shell\PhotoUnikalizer" "Icon" "$0,0"
  WriteRegStr HKLM "Software\Classes\SystemFileAssociations\image\shell\PhotoUnikalizer\command" "" '"$0" "%1"'

  WriteRegStr HKLM "Software\Classes\Directory\shell\PhotoUnikalizer" "MUIVerb" "Send to PhotoUnikalizer"
  WriteRegStr HKLM "Software\Classes\Directory\shell\PhotoUnikalizer" "Icon" "$0,0"
  WriteRegStr HKLM "Software\Classes\Directory\shell\PhotoUnikalizer\command" "" '"$0" "%1"'

  WriteRegStr HKLM "Software\Classes\Directory\Background\shell\PhotoUnikalizer" "MUIVerb" "Send to PhotoUnikalizer"
  WriteRegStr HKLM "Software\Classes\Directory\Background\shell\PhotoUnikalizer" "Icon" "$0,0"
  WriteRegStr HKLM "Software\Classes\Directory\Background\shell\PhotoUnikalizer\command" "" '"$0" "%V"'
!macroend

!macro customUnInstall
  DeleteRegKey HKLM "Software\Classes\SystemFileAssociations\image\shell\PhotoUnikalizer\command"
  DeleteRegKey HKLM "Software\Classes\SystemFileAssociations\image\shell\PhotoUnikalizer"

  DeleteRegKey HKLM "Software\Classes\Directory\shell\PhotoUnikalizer\command"
  DeleteRegKey HKLM "Software\Classes\Directory\shell\PhotoUnikalizer"

  DeleteRegKey HKLM "Software\Classes\Directory\Background\shell\PhotoUnikalizer\command"
  DeleteRegKey HKLM "Software\Classes\Directory\Background\shell\PhotoUnikalizer"
!macroend