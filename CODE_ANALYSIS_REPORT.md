# Deck Tracker - Kod Analiz Raporu

**Tarih:** 15 Şubat 2026  
**Proje:** HS Deck Tracker - Hearthstone Deck Tracker

---

## 🔴 Kritik Hatalar (3)

### 1. DeckManager.saveDeck() - ID Overwrite Bug
**Dosya:** `src/core/deckManager.js:37-54`  
**Önem:** Yüksek

**Sorun:** Spread operator önce oluşturulan ID'yi eziyor.

```javascript
this.decks.push({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),  // Önce ID oluşturuluyor
    name: deck.name || 'Unnamed Deck',
    heroClass: deck.heroClass || '',
    cards: deck.cards || [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...deck,  // deck.id varsa yukarıdaki ID üzerine yazılıyor!
});
```

**Etki:** Aynı deck kodunu tekrar import edince duplicate deck oluşuyor veya ID kaybı yaşanıyor.

**Çözüm:** Spread operator'ü en üste taşı:
```javascript
this.decks.push({
    ...deck,
    id: deck.id || Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    name: deck.name || 'Unnamed Deck',
    createdAt: deck.createdAt || Date.now(),
    updatedAt: Date.now(),
});
```

---

### 2. Electron Main - Race Condition
**Dosya:** `electron/main.js:133-140`  
**Önem:** Yüksek

**Sorun:** `mainWindow` null check eksik

```javascript
ipcMain.on('window-maximize', () => {
    if (mainWindow?.isMaximized()) {
        mainWindow.unmaximize();  // mainWindow null olabilir
    } else {
        mainWindow?.maximize();
    }
});
```

**Etki:** NullReferenceException / crash riski

**Çözüm:** 
```javascript
ipcMain.on('window-maximize', () => {
    if (!mainWindow) return;
    if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
    } else {
        mainWindow.maximize();
    }
});
```

---

### 3. LogParser SHOW_ENTITY Regex Capture Groups
**Dosya:** `src/core/logParser.js:80-91`  
**Önem:** Orta-Yüksek

**Sorun:** Regex pattern'deki capture group indeksleri kontrol edilmeli

```javascript
const showEntityMatch = line.match(PATTERNS.showEntity);
if (showEntityMatch) {
    const event = {
        type: 'SHOW_ENTITY',
        entityName: showEntityMatch[1] || '',
        entityId: parseInt(showEntityMatch[2] || showEntityMatch[7]),
        zone: showEntityMatch[3] || '',
        cardId: showEntityMatch[8] || showEntityMatch[5] || '',
        playerId: parseInt(showEntityMatch[6]) || 0,
    };
```

**Etki:** Yanlış entityId/cardId ayrıştırma → yanlış kart takibi

**Öneri:** Regex testleri eklenmeli ve capture group'lar doğrulanmalı

---

## 🟡 Orta Önemli Hatalar (3)

### 4. SettingsPage State Type Mismatch
**Dosya:** `src/main-window/pages/SettingsPage.jsx:24-50`  
**Önem:** Orta

**Sorun:** Input'lardan gelen değerler string, state number olarak tutuluyor

```javascript
const [overlayOpacity, setOverlayOpacity] = useState(75); // number
// ...
onChange={(e) => setOverlayOpacity(e.target.value)} // string geliyor
```

**Çözüm:**
```javascript
onChange={(e) => setOverlayOpacity(parseInt(e.target.value))}
```

---

### 5. Deck Import - ID Eksikliği
**Dosya:** `src/core/deckManager.js:228-238`  
**Önem:** Orta

**Sorun:** `importDeckCode()` fonksiyonu import edilen deck'e ID atamıyor

```javascript
const deck = {
    name: deckName || `Imported Deck`,
    heroClass,
    format: format === 2 ? 'Standard' : format === 1 ? 'Wild' : 'Classic',
    cards,
    deckCode: code,
    totalCards,
    // id eksik!
};
this.saveDeck(deck);  // saveDeck içinde ID oluşturuluyor
```

**Etki:** Her import aynı deck için yeni ID oluşturuyor → duplicate deck'ler

**Çözüm:** Import ederken unique identifier ekle (örn: deckCode hash'i)

---

### 6. GameState PLAYSTATE Logic
**Dosya:** `src/core/gameState.js:233-248`  
**Önem:** Orta

**Sorun:** Oyun sonu sonuç belirleme mantığı karmaşık ve potansiyel olarak yanlış

```javascript
if (tag === 'PLAYSTATE' && (value === 'WON' || value === 'LOST' || value === 'TIED')) {
    this.state.gamePhase = GAME_PHASE.GAME_OVER;
    const isPlayerEntity =
        event.entityName === this.state.player.name ||
        entityId === this.state.player.entityId;

    const result = {
        result: isPlayerEntity ? value : (value === 'WON' ? 'LOST' : 'WON'),
        // ...
    };
```

**Etki:** isPlayerEntity yanlış hesaplanırsa ters sonuç kaydedilir

**Öneri:** Entity-player eşleştirmesi daha robust yapılmalı

---

## 🟢 Düşük Önemli Sorunlar (4)

### 7. Fatigue Tracking - Kullanılmıyor
**Dosya:** `src/core/gameState.js:47,61`  
**Önem:** Düşük

**Sorun:** `fatigueCount` player ve opponent için tanımlı ama hiç artırılmıyor

```javascript
player: {
    // ...
    fatigueCount: 0,  // Tanımlı ama kullanılmıyor
},
opponent: {
    // ...
    fatigueCount: 0,  // Tanımlı ama kullanılmıyor
},
```

**Etki:** Ölü kod (dead code)

---

### 8. React Key Kullanımı - Index Tabanlı
**Dosyalar:**
- `DeckTracker.jsx:19`
- `OpponentTracker.jsx:63`  
- `DecksPage.jsx:99`

**Önem:** Düşük

**Sorun:** Array index'i key olarak kullanılıyor

```javascript
cards.map((card, i) => (
    <div key={card.cardId + '-' + i}>
```

**Öneri:** Unique ve stabil ID kullanılmalı (örn: entityId)

---

### 9. Memory Leak Riski - Event Listeners
**Dosya:** `electron/preload.js:14-19`  
**Önem:** Düşük

**Sorun:** IPC event listener'lar component unmount'ta temizlenmiyor

```javascript
onGameStateUpdate: (callback) => {
    ipcRenderer.on('game-state-update', (_, state) => callback(state));
},
```

**Etki:** Bellek sızıntısı (özellikle uzun süreli kullanımda)

**Çözüm:** Remove listener fonksiyonları eklenmeli:
```javascript
onGameStateUpdate: (callback) => {
    const handler = (_, state) => callback(state);
    ipcRenderer.on('game-state-update', handler);
    return () => ipcRenderer.removeListener('game-state-update', handler);
},
```

---

### 10. LogConfig Güncellemesi Eksik
**Dosya:** `src/core/logConfig.js:59-73`  
**Önem:** Düşük

**Sorun:** Mevcut section varsa içerik güncellenmiyor

```javascript
if (!content.includes(sectionHeader)) {
    // Sadece section yoksa ekleniyor
    // Mevcut section varsa içerik güncellenmiyor
}
```

**Etki:** Log seviyesi değişiklikleri uygulanmıyor

---

## 📊 Özet

| Kategori | Sayı | Öncelik |
|----------|------|---------|
| 🔴 Kritik | 3 | Hemen düzeltilmeli |
| 🟡 Orta | 3 | Bir sonraki sürümde düzeltilmeli |
| 🟢 Düşük | 4 | Refactor aşamasında düzeltilmeli |
| **Toplam** | **10** | |

---

## 🎯 Önerilen Eylem Planı

1. **Öncelik 1:** DeckManager ID overwrite hatası düzeltilmeli
2. **Öncelik 2:** Electron race condition kontrol edilmeli
3. **Öncelik 3:** LogParser regex pattern'leri test edilmeli
4. **Öncelik 4:** Type mismatch'ler düzeltilmeli
5. **Öncelik 5:** Memory leak önlemleri alınmalı

---

*Rapor oluşturulma tarihi: 15 Şubat 2026*
