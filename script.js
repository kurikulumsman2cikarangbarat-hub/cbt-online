const API_URL = "https://nocob-proxy.kurikulum-sman2cikarangbarat.workers.dev";
let app = { 
    qs: [], curIdx: 0, ans: {}, student: null, 
    config: {}, timeLeft: 0, timer: null, optionStates: {}, jml_curang: 0 
};

// --- RECOVERY & INIT ---
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
    document.querySelectorAll('.page, .page-exam, .page-center').forEach(v => v.classList.remove('active'));
    document.getElementById(id).classList.add('active');
};

const saveSesi = () => localStorage.setItem('cbt_session', JSON.stringify(app));
const resetSesi = () => { localStorage.clear(); location.reload(); };

// --- LOGIN ---
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
    
    if(!n || !k || !g || !t) return alert("Mohon lengkapi data!");
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
        
        saveSesi();
        document.getElementById('welcome-name').innerText = `Halo, ${n}!`;
        document.getElementById('welcome-class').innerText = `Kelas ${g}`;
        showView('view-welcome');
    } catch(e) { alert(e.message); showView('view-login'); }
};

// --- EXAM ENGINE ---
document.getElementById('start-exam-btn').onclick = () => {
    const el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen();
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

    // GAMBAR SOAL
    const imgContainer = document.getElementById('q-img-container');
    imgContainer.innerHTML = q.img_link ? `<img src="${q.img_link}" class="q-img">` : "";

    // FITUR ACAK JAWABAN PER SISWA
    if (!app.optionStates[qId]) {
        let opts = [{l:'A',t:q.opsi_a},{l:'B',t:q.opsi_b},{l:'C',t:q.opsi_c},{l:'D',t:q.opsi_d},{l:'E',t:q.opsi_e}].filter(o=>o.t);
        app.optionStates[qId] = opts.sort(() => Math.random() - 0.5);
    }

    document.getElementById('q-options').innerHTML = app.optionStates[qId].map((o, i) => {
        const letter = String.fromCharCode(65 + i);
        const sel = app.ans[qId] === o.l ? 'selected' : '';
        return `<div class="option ${sel}" onclick="setAns('${qId}','${o.l}')">
                    <strong style="margin-right:12px">${letter}.</strong> <span>${o.t}</span>
                </div>`;
    }).join('');

    document.getElementById('btn-finish').style.display = Object.keys(app.ans).length === app.qs.length ? 'block' : 'none';
    renderNav();
}

// OTOMATIS PINDAH SOAL
window.setAns = (id, val) => {
    app.ans[id] = val;
    renderQ();
    saveSesi();
    setTimeout(() => { if(app.curIdx < app.qs.length - 1) { app.curIdx++; renderQ(); } }, 250);
};

function renderNav() {
    document.getElementById('nav-grid').innerHTML = app.qs.map((q, i) => {
        const done = app.ans[q.Id || q.id] ? 'answered' : '';
        const active = app.curIdx === i ? 'active' : '';
        return `<div class="box ${done} ${active}" onclick="app.curIdx=${i};renderQ()">${i+1}</div>`;
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
document.getElementById('btn-finish').onclick = () => { if(confirm("Kirim jawaban?")) submitFinal(); };

async function submitFinal() {
    clearInterval(app.timer);
    showView('view-loading');
    
    let benar = 0;
    app.qs.forEach(q => { if(app.ans[q.Id||q.id] === q.kunci) benar++; });

    const payload = {
        nama_siswa: app.student.nama, token: app.student.token, mapel: app.config.mapel,
        kelas: app.student.tingkat, id_kelas: app.student.rombel, jml_benar: benar,
        jml_salah: app.qs.length - benar, nilai: Math.round((benar/app.qs.length)*100),
        nama_guru: app.config.guru, curang: app.jml_curang,
        wkt_mulai: app.start, wkt_selesai: new Date().toISOString()
    };

    try {
        await fetch(`${API_URL}/api/nilai`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        document.getElementById('final-msg').innerHTML = `Jawaban <b>${app.student.nama}</b> berhasil terkirim.`;
        localStorage.clear();
        showView('view-result');
    } catch(e) { alert("Gagal kirim, mencoba lagi..."); setTimeout(submitFinal, 3000); }
}

// SILENT CHEAT RECORDING
document.addEventListener("visibilitychange", () => {
    if (document.hidden && document.getElementById('view-exam').classList.contains('active')) {
        app.jml_curang++;
        saveSesi();
    }
});
