"""Verification du schema Motiq, lue DANS la base (pas une supposition).

Interroge le catalogue PostgreSQL du projet et affiche :
  - chaque table, si RLS est activee, et combien de politiques la protegent
  - les 8 templates du catalogue
  - le bucket de stockage
  - les declencheurs

Aucune valeur sensible n'est affichee.
"""

from __future__ import annotations

import json
import sys

sys.path.insert(0, r"C:\Users\Diomande\Motiq\outils")
from api_supabase import appel  # noqa: E402

REF = "lsdijolrsghaxwopabfu"

TABLES_ATTENDUES = [
    "profiles", "brand_kits", "templates", "projects",
    "assets", "render_jobs", "subscriptions", "usage",
]


def interroger(sql: str):
    code, corps = appel("POST", f"/projects/{REF}/database/query", {"query": sql})
    if code not in (200, 201):
        print(f"  ERREUR HTTP {code} : {corps[:300]}")
        return None
    return json.loads(corps) if corps.strip() else []


print("=" * 78)
print(" VERIFICATION DU SCHEMA — projet motiq")
print("=" * 78)

print("\n1) TABLES, RLS ET POLITIQUES")
lignes = interroger("""
select c.relname as table,
       c.relrowsecurity as rls,
       (select count(*) from pg_policies p
         where p.schemaname = 'public' and p.tablename = c.relname) as policies
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public' and c.relkind = 'r'
 order by c.relname
""")

if lignes is None:
    sys.exit(1)

print(f"   {'table':<16} {'RLS':<8} {'politiques':<12} verdict")
print("   " + "-" * 62)
trouvees = {r["table"]: r for r in lignes}
for nom in TABLES_ATTENDUES:
    r = trouvees.get(nom)
    if not r:
        print(f"   {nom:<16} {'—':<8} {'—':<12} MANQUANTE")
        continue
    rls = "OUI" if r["rls"] else "NON"
    pol = r["policies"]
    verdict = "OK" if (r["rls"] and pol > 0) else "PROBLEME"
    print(f"   {nom:<16} {rls:<8} {pol:<12} {verdict}")

autres = [r["table"] for r in lignes if r["table"] not in TABLES_ATTENDUES]
print(f"\n   total de tables dans public : {len(lignes)}")
if autres:
    print(f"   autres tables presentes     : {', '.join(autres)}")

print("\n2) CATALOGUE DES TEMPLATES")
tpl = interroger("select id, nom, categorie, format from public.templates order by id")
if tpl is not None:
    print(f"   nombre de templates : {len(tpl)}  (minimum exige par le cahier des charges : 8)")
    for t in tpl:
        print(f"     - {t['id']:<10} {t['nom']:<11} {t['categorie']:<11} {t['format']}")

print("\n3) STOCKAGE")
buckets = interroger("select id, name, public from storage.buckets order by id")
if buckets is not None:
    for b in buckets:
        print(f"   bucket '{b['name']}'  public={b['public']}  (prive = accessible au seul proprietaire)")
pol_storage = interroger("""
select policyname from pg_policies
 where schemaname = 'storage' and tablename = 'objects'
 order by policyname
""")
if pol_storage is not None:
    print(f"   politiques sur storage.objects : {len(pol_storage)}")
    for p in pol_storage:
        print(f"     - {p['policyname']}")

print("\n4) DECLENCHEURS")
trg = interroger("""
select tgname, c.relname as table
  from pg_trigger t
  join pg_class c on c.oid = t.tgrelid
  join pg_namespace n on n.oid = c.relnamespace
 where not t.tgisinternal and n.nspname in ('public', 'auth')
 order by c.relname, tgname
""")
if trg is not None:
    for t in trg:
        print(f"   {t['table']:<16} {t['tgname']}")

print("\n" + "=" * 78)
