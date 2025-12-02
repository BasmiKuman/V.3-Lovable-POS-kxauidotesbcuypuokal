import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Read .env.local file
const envFile = readFileSync('.env.local', 'utf8');
const envVars = {};
envFile.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length) {
    envVars[key.trim()] = valueParts.join('=').trim();
  }
});

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables!');
  process.exit(1);
}

console.log('='.repeat(60));
console.log('📧 KONFIGURASI EMAIL VERIFICATION');
console.log('='.repeat(60));
console.log('\nSupabase Project:', supabaseUrl);
console.log('\n⚠️  PENTING: Konfigurasi Email Template harus dilakukan di Supabase Dashboard');
console.log('\nBerikut langkah-langkahnya:\n');

console.log('1️⃣  BUKA SUPABASE DASHBOARD');
console.log('   URL: https://supabase.com/dashboard/project/mlwvrqjsaomthfcsmoit');
console.log('');

console.log('2️⃣  MASUK KE AUTHENTICATION > EMAIL TEMPLATES');
console.log('   Navigasi: Authentication → Email Templates');
console.log('');

console.log('3️⃣  PILIH TEMPLATE "Confirm signup"');
console.log('');

console.log('4️⃣  UPDATE REDIRECT URL');
console.log('   Ganti {{ .SiteURL }} dengan URL aplikasi Anda:');
console.log('');
console.log('   DEVELOPMENT (localhost):');
console.log('   http://localhost:8080/email-verified');
console.log('');
console.log('   PRODUCTION (setelah deploy):');
console.log('   https://your-domain.com/email-verified');
console.log('');

console.log('5️⃣  CONTOH TEMPLATE EMAIL:');
console.log('-'.repeat(60));
console.log(`
<h2>Konfirmasi Email Anda</h2>

<p>Halo,</p>

<p>Terima kasih telah mendaftar! Silakan klik tombol di bawah untuk memverifikasi email Anda:</p>

<p>
  <a href="{{ .ConfirmationURL }}" 
     style="background-color: #4F46E5; color: white; padding: 12px 24px; 
            text-decoration: none; border-radius: 6px; display: inline-block;">
    Verifikasi Email
  </a>
</p>

<p>Atau copy link berikut ke browser Anda:</p>
<p><a href="{{ .ConfirmationURL }}">{{ .ConfirmationURL }}</a></p>

<p>Link ini akan kadaluarsa dalam 24 jam.</p>

<p>Jika Anda tidak mendaftar, abaikan email ini.</p>

<p>Terima kasih,<br>Tim POS System</p>
`);
console.log('-'.repeat(60));
console.log('');

console.log('6️⃣  UPDATE SITE URL (IMPORTANT!)');
console.log('   Pergi ke: Settings → Authentication → Site URL');
console.log('   ');
console.log('   Development:');
console.log('   http://localhost:8080');
console.log('   ');
console.log('   Production:');
console.log('   https://your-domain.com');
console.log('');

console.log('7️⃣  UPDATE REDIRECT URLs');
console.log('   Pergi ke: Settings → Authentication → Redirect URLs');
console.log('   Tambahkan:');
console.log('   ');
console.log('   http://localhost:8080/email-verified');
console.log('   http://localhost:8080/**');
console.log('   https://your-domain.com/email-verified');
console.log('   https://your-domain.com/**');
console.log('');

console.log('8️⃣  KLIK "SAVE" untuk menyimpan perubahan');
console.log('');

console.log('='.repeat(60));
console.log('✅ SETELAH KONFIGURASI SELESAI:');
console.log('='.repeat(60));
console.log('');
console.log('User yang mendaftar akan:');
console.log('1. Menerima email verifikasi');
console.log('2. Klik link di email');
console.log('3. Diarahkan ke halaman /email-verified (bukan error!)');
console.log('4. Melihat pesan sukses dengan tombol "Login Sekarang"');
console.log('5. Bisa langsung login ke aplikasi');
console.log('');

console.log('='.repeat(60));
console.log('📝 CATATAN PENTING:');
console.log('='.repeat(60));
console.log('');
console.log('• Email template tidak bisa diubah via API, harus manual di dashboard');
console.log('• Pastikan SITE URL dan REDIRECT URLs sudah benar');
console.log('• Untuk production, ganti localhost dengan domain asli');
console.log('• Test dengan mendaftar user baru dan cek emailnya');
console.log('');

console.log('='.repeat(60));
console.log('🔗 QUICK LINKS:');
console.log('='.repeat(60));
console.log('');
console.log('Dashboard: https://supabase.com/dashboard/project/mlwvrqjsaomthfcsmoit');
console.log('Email Templates: https://supabase.com/dashboard/project/mlwvrqjsaomthfcsmoit/auth/templates');
console.log('Auth Settings: https://supabase.com/dashboard/project/mlwvrqjsaomthfcsmoit/settings/auth');
console.log('');
console.log('='.repeat(60));
