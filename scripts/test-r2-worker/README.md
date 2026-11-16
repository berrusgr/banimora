# Canlı R2 Worker Test Aracı (GitHub OAuth — Yalnızca DEV)

Bu test aracı, **GitHub OAuth** ile oturum açan kullanıcının tarayıcıdaki mevcut Supabase oturumunu kullanarak deploy edilmiş `banimora-media-worker` servisini canlı test eder.

- **Üretim ortamında kapalıdır**: `src/main.tsx` içinde `import.meta.env.DEV` koruması vardır; `npm run build` çıktısına (`dist/`) dahil edilmez.
- **Şifre veya `service_role` gerektirmez**: Mevcut GitHub OAuth oturumunuzu yalnızca bellek içinde kullanır; token veya tam imzalı URL loglamaz.

## Çalıştırma

1. Geliştirme sunucusunu başlatın:
   ```bash
   npm run dev
   ```
2. *(İsteğe bağlı)* Terminalde de sonuçları görmek için ikinci bir terminalde dinleyiciyi başlatın:
   ```bash
   node scripts/test-r2-worker/run-live-test.mjs
   ```
3. Tarayıcıda şu adresi açın:
   `http://localhost:5173/?r2test=1`
4. Oturum açık değilse **GitHub ile Giriş Yap**'a tıklayın, ardından **10 Canlı R2 Testini Çalıştır** düğmesine basın.
