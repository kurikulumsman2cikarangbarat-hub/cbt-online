const API_URL = "https://nocob-proxy.kurikulum-sman2cikarangbarat.workers.dev";
let app = { 
    qs: [], curIdx: 0, ans: {}, student: null, 
    config: {}, timeLeft: 0, timer: null, jml_curang: 0 
};

// --- INITIALIZATION & RECOVERY ---
window.onload = () => {
    const saved = localStorage.getItem('cbt_session');
    if (saved) {
        app = JSON.parse(saved);
        if (app.student) {
            document.getElementById('welcome-name').innerText = `Halo, ${app.student.nama}!`;
            document.getElementById('welcome-class').innerText = `Kelas ${app.student.rombel}`;
            showView('view-welcome');
        } else { showView('view-login'); }
    } else { showView('view-login'); }
};

const showView = (id) => {
    document.querySelectorAll('.page, .page-exam, .page-center').forEach(p => p.classList.remove('active'));
    document.getElementById(id).classList.add('active');
};

const saveSesi = () => localStorage.setItem('cbt_session', JSON.stringify(app));
const resetSesi = () => { localStorage.clear(); location.reload(); };

// --- LOGIN FLOW ---
document.getElementById('input-kelas').addEventListener('change', (e) => {
    const s = document.getElementById('input-kelompok');
    s.innerHTML = '<option value="" disabled selected>Pilih Kelas</option>';
    ["A","B","C","D","E","F","G","H","I","J","K","L"].forEach(h => {
        let o = document.createElement("option"); o.value = `${e.target.value}-${h}`; o.text = `${e.target.value} - ${h}`; s.appendChild(o);
    });
});

document.getElementById('login-btn').onclick = async () => {
    const n = document.getElementById('input-nama').value, k = document.getElementById('input-kelas').value, 
          g = document.getElementById('input-kelompok').value, t = document.getElementById('input-token').value.trim();
    
    if(!n || !k || !g || !t) return alert("Mohon lengkapi semua data!");

    showView('view-loading');
    try {
        const [rU, rS] = await Promise.all([
            fetch(`${API_URL}/api/ujian?where=(token,eq,${t})`),
            fetch(`${API_URL}/api/bank_soal?where=(token,eq,${t})`)
        ]);
        const dU = await rU.json(), dS = await rS.json();
        if(!dU.list.length) throw new Error("Token tidak valid!");
        
        app.qs = dS.list.sort(() => Math.random() - 0.5);
        app.student = { nama: n, tingkat: k, rombel: g, token: t };
        app.config = { mapel: dU.list[0].mapel, guru: dU.list[0].nama_guru };
        app.timeLeft = (parseInt(dU.list[0].durasi) || 90) * 60;

        document.getElementById('welcome-name').innerText = `Halo, ${n}!`;
        document.getElementById('welcome-class').innerText = `Kelas ${g}`;
        saveSesi();
        showView('view-welcome');
    } catch(e) { alert(e.message); showView('view-login'); }
};

// --- EXAM ENGINE ---
document.getElementById('start-exam-btn').onclick = () => {
    // Mode Full Screen
    const doc = document.documentElement;
    if (doc.requestFullscreen) doc.requestFullscreen();
    else if (doc.webkitRequestFullscreen) doc.webkitRequestFullscreen();

    app.start = new Date().toISOString();
    showView('view-exam');
    renderQ();
    startTimer();
};

function renderQ() {
    const q = app.qs[app.curIdx];
    const qId = q.Id || q.id;
    document.getElementById('q-number').innerText = `${app.curIdx + 1} / ${app.qs.length}`;
    document.getElementById('q-text').innerHTML = q.soal;

    // Perbaikan Gambar
    const imgWrapper = document.getElementById('image-wrapper');
    imgWrapper.innerHTML = q.img_link ? `<img src="${q.img_link}" class="img-soal">` : "";

    const ops = ['a','b','c','d','e'].filter(k => q['opsi_'+k]);
    document.getElementById('q-options').innerHTML = ops.map(k => {
        const sel = app.ans[qId] === k.toUpperCase() ? 'active' : '';
        return `<div class="option-item ${sel}" onclick="setAns('${qId}','${k.toUpperCase()}')">
                    <strong style="margin-right:12px">${k.toUpperCase()}.</strong> ${q['opsi_'+k]}
                </div>`;
    }).join('');

    document.getElementById('btn-finish').style.display = 
        Object.keys(app.ans).length === app.qs.length ? 'block' : 'none';
    renderNav();
}

window.setAns = (id, val) => {
    app.ans[id] = val;
    renderQ();
    saveSesi();
    setTimeout(() => { if(app.curIdx < app.qs.length - 1) { app.curIdx++; renderQ(); } }, 250);
};

function renderNav() {
    document.getElementById('nav-grid').innerHTML = app.qs.map((q, i) => {
        const done = app.ans[q.Id || q.id] ? 'done' : '';
        const curr = app.curIdx === i ? 'curr' : '';
        return `<div class="box-mini ${done} ${curr}" onclick="app.curIdx=${i};renderQ()">${i+1}</div>`;
    }).join('');
}

function startTimer() {
    app.timer = setInterval(() => {
        app.timeLeft--;
        let m = Math.floor(app.timeLeft/60).toString().padStart(2,'0'), s = (app.timeLeft%60).toString().padStart(2,'0');
        document.getElementById('timer-display').innerText = `${m}:${s}`;
        if(app.timeLeft <= 0) submitFinal();
    }, 1000);
}

document.getElementById('next-btn').onclick = () => { if(app.curIdx < app.qs.length-1) { app.curIdx++; renderQ(); } };
document.getElementById('prev-btn').onclick = () => { if(app.curIdx > 0) { app.curIdx--; renderQ(); } };
document.getElementById('btn-kirim-trigger').onclick = () => { if(confirm("Kirim jawaban sekarang?")) submitFinal(); };

async function submitFinal() {
    clearInterval(app.timer);
    showView('view-loading');
    document.getElementById('loading-text').innerText = "Mengirim Nilai...";

    let benar = 0;
    app.qs.forEach(q => { if(app.ans[q.Id||q.id] === q.kunci) benar++; });

    const payload = {
        nama_siswa: app.student.nama,
        token: app.student.token,
        mapel: app.config.mapel,
        kelas: app.student.tingkat,
        id_kelas: app.student.rombel,
        jml_benar: benar,
        jml_salah: app.qs.length - benar,
        nilai: Math.round((benar/app.qs.length)*100),
        nama_guru: app.config.guru,
        jml_curang: app.jml_curang,
        wkt_mulai: app.start,
        wkt_selesai: new Date().toISOString()
    };

    try {
        await fetch(`${API_URL}/api/nilai`, { 
            method: "POST", headers: { "Content-Type": "application/json" }, 
            body: JSON.stringify(payload) 
        });
        document.getElementById('final-msg').innerHTML = `Jawaban <b>${app.student.nama}</b> berhasil terkirim.`;
        localStorage.clear();
        showView('view-result');
    } catch(e) { alert("Koneksi gagal, mencoba ulang otomatis..."); setTimeout(submitFinal, 3000); }
}

// --- SILENT CHEAT DETECTION ---
document.addEventListener("visibilitychange", () => {
    if (document.hidden && document.getElementById('view-exam').classList.contains('active')) {
        app.jml_curang++;
        saveSesi();
    }
});
