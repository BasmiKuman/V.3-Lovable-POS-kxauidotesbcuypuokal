#!/usr/bin/env python3

"""
Supabase Migration Runner
Menjalankan SQL migrations ke Supabase database menggunakan REST API
"""

import requests
import time
from pathlib import Path

# Konfigurasi
SUPABASE_URL = "https://mlwvrqjsaomthfcsmoit.supabase.co"
SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sd3ZycWpzYW9tdGhmY3Ntb2l0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTU1ODU1NCwiZXhwIjoyMDc3MTM0NTU0fQ.G2vDaqFJyrbLovZ0p32sVFL0g8Ds-bUqot7pEdhBesU"

def print_header():
    print("=" * 60)
    print(" " * 15 + "🚀 Supabase Migration Runner")
    print("=" * 60)
    print()

def run_sql(sql_content):
    """Execute SQL using Supabase Management API"""
    headers = {
        "apikey": SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
        "Content-Type": "application/json"
    }
    
    # Try to execute via query endpoint
    url = f"{SUPABASE_URL}/rest/v1/rpc/exec_sql"
    
    try:
        response = requests.post(
            url,
            headers=headers,
            json={"sql": sql_content},
            timeout=300
        )
        
        return response.status_code == 200, response.text
    except Exception as e:
        return False, str(e)

def main():
    print_header()
    
    # Read migration file
    migration_file = Path("complete-migration.sql")
    
    if not migration_file.exists():
        print("❌ Error: complete-migration.sql tidak ditemukan!")
        print("   Pastikan file ada di directory yang sama dengan script ini.\n")
        return
    
    print(f"📝 Membaca {migration_file}...")
    sql_content = migration_file.read_text()
    
    print(f"   ✓ File berisi {len(sql_content)} karakter")
    print(f"   ✓ Total {len(sql_content.splitlines())} baris\n")
    
    print("🔄 Menjalankan migration...")
    print("   (Ini mungkin memakan waktu beberapa menit...)\n")
    
    # Method 1: Try direct execution
    print("📡 Mencoba method 1: Direct SQL execution...")
    success, message = run_sql(sql_content)
    
    if success:
        print("   ✅ Migration berhasil!\n")
    else:
        print(f"   ⚠️  Method 1 gagal: {message[:100]}...\n")
        print("   💡 Menggunakan method alternatif...\n")
        
        # Method 2: Execute statement by statement
        statements = [
            s.strip() 
            for s in sql_content.split(';') 
            if s.strip() and not s.strip().startswith('--')
        ]
        
        print(f"   📊 Memproses {len(statements)} SQL statements...")
        print("   ", end="", flush=True)
        
        success_count = 0
        fail_count = 0
        
        for i, statement in enumerate(statements):
            if not statement:
                continue
                
            success, _ = run_sql(statement + ';')
            
            if success:
                success_count += 1
                print("✓", end="", flush=True)
            else:
                fail_count += 1
                print("✗", end="", flush=True)
            
            if (i + 1) % 50 == 0:
                print(f" ({i+1}/{len(statements)})", flush=True)
                print("   ", end="", flush=True)
            
            time.sleep(0.1)  # Avoid rate limiting
        
        print(f"\n\n   📈 Hasil: {success_count} sukses, {fail_count} gagal\n")
        
        if fail_count > 0:
            print("   ⚠️  Beberapa statement gagal. Ini bisa normal jika:")
            print("      - Object sudah ada sebelumnya")
            print("      - Policy sedang di-recreate")
            print()
    
    print("=" * 60)
    print("✨ Migration process selesai!")
    print("=" * 60)
    print()
    print("📋 Langkah selanjutnya:")
    print("   1. Verifikasi tables di Supabase Dashboard")
    print("   2. Cek RLS policies sudah aktif")
    print("   3. Test aplikasi dengan npm run dev\n")
    print(f"🔗 Dashboard: https://supabase.com/dashboard/project/mlwvrqjsaomthfcsmoit\n")

if __name__ == "__main__":
    main()
