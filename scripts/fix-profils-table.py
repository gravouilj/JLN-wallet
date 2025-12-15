#!/usr/bin/env python3
"""
Script pour remplacer toutes les occurrences de .from('profils') par .from('profiles')
dans le fichier profilService.js
"""

import re

file_path = '/workspaces/farm-wallet-independant/src/services/profilService.js'

# Lire le fichier
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Remplacer toutes les occurrences
content = content.replace(".from('profils')", ".from('profiles')")

# Écrire le fichier
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"✅ Toutes les occurrences de .from('profils') ont été remplacées par .from('profiles')")
print(f"✅ Fichier {file_path} mis à jour")
