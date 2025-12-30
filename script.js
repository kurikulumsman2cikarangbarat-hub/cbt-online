const API_URL = "https://nocob-proxy.kurikulum-sman2cikarangbarat.workers.dev";
let state = {
    qs: [], curIdx: 0, ans: {}, student: null, config: null,
    timer: null, timeLeft: 0, jml_curang: 0, startTime: null
};

// --- INITIALIZATION & RECOVERY ---
window.onload = () => {
    const saved = localStorage.getItem('cbt_session');
    if (saved) {
        state = JSON.parse(saved);
        if (state.student) {
            document.getElementById('greet-nama').innerText = "Halo, " + state.student.nama;
            document.getElementById('greet-kelas').innerText = "Kelas " + state.student.rombel;
            showView('view-welcome');
        } else { showView('view-login'); }
    } else { showView('view-login'); }
};

const showView = (id) => {
    document.querySelectorAll('.page, .page-exam').forEach(v => v.classList.remove('active'));
    document.getElementById(id).classList.add('active');
};

const saveState = () => localStorage.setItem('cbt_session', JSON.stringify(state));
const resetSesi = () => { localStorage.clear(); location.reload(); };

// --- LOGIN ---
document.getElementById('in-tingkat').onchange = (e) => {
    const r = document.getElementById('in-rombel');
    r.innerHTML = '<option value="" disabled selected>-- Pilih Kelas --</option>';
    "ABCDEFGHIJKL".split("").forEach(l => {
        let o = document.createElement("option"); o.value = `${e.target.value}-${l}`; o.text = `${e.target.value} - ${l}`; r.appendChild(o);
    });
};

document.getElementById('btn-login').onclick = async () => {
    const n = document.getElementById('in-nama').value, t = document.getElementById('in-tingkat').value,
          r = document.getElementById('in-rombel').value, tk = document.getElementById('in-token').value.trim();

    if(!n || !r || !tk) return alert("Lengkapi data!");
    showView('view-loading');

    try {
        const [rU, rS] = await Promise.all([
            fetch(`${API_URL}/api/ujian?where=(token,eq,${tk})`),
            fetch(`${API_URL}/api/bank_soal?where=(token,eq,${tk})`)
        ]);
        const dU = await rU.json(), dS = await rS.json();
        if(!dU.list.length) throw new Error("Token Salah!");

        state.qs = dS.list.sort(() => Math.random() - 0.5);
        state.student = { nama: n, tingkat: t, rombel: r, token: tk };
        state.config = dU.list[0];
        state.timeLeft = (parseInt(dU.list[0].durasi) || 90) * 60;
        
        saveState();
        document.getElementById('greet-nama').innerText = "Halo, " + n;
        document.getElementById('greet-kelas').innerText = "Kelas " + r;
        showView('view-welcome');
    } catch(e) { alert(e.message); showView('view-login'); }
};

// --- EXAM ENGINE ---
document.getElementById('btn-start').onclick = () => {
    const el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen();
    state.startTime = new Date().toISOString();
    showView('view-exam');
    renderQ();
    startTimer();
};

function renderQ() {
    const q = state.qs[state.curIdx];
    const qId = q.Id || q.id;
    document.getElementById('idx-text').innerText = `${state.curIdx + 1} / ${state.qs.length}`;
    document.getElementById('q-text').innerHTML = q.soal;

    const imgBox = document.getElementById('q-img-container');
    imgBox.innerHTML = q.img_link ? `<img src="${q.img_link}" class="q-img">` : "";

    const ops = ['a','b','c','d','e'].filter(k => q['opsi_'+k]);
    document.getElementById('q-options').innerHTML = ops.map(k => {
        const sel = state.ans[qId] === k.toUpperCase() ? 'selected' : '';
        return `<div class="opt ${sel}" onclick="setAns('${qId}','${k.toUpperCase()}')">
                    <span style="margin-right:10px">${k.toUpperCase()}.</span> ${q['opsi_'+k]}
                </div>`;
    }).join('');

    document.getElementById('btn-finish').style.display = 
        Object.keys(state.ans).length === state.qs.length ? 'block' : 'none';
    renderNav();
}

window.setAns = (id, val) => {
    state.ans[id] = val;
    renderQ();
    saveState();
};

function renderNav() {
    document.getElementById('nav-grid').innerHTML = state.qs.map((q, i) => {
        const done = state.ans[q.Id || q.id] ? 'done' : '';
        const active = state.curIdx === i ? 'active' : '';
        return `<div class="nav-item ${done} ${active}" onclick="state.curIdx=${i};renderQ()">${i+1}</div>`;
    }).join('');
}

function startTimer() {
    if(state.timer) clearInterval(state.timer);
    state.timer = setInterval(() => {
        state.timeLeft--;
        const m = Math.floor(state.timeLeft/60).toString().padStart(2,'0');
        const s = (state.timeLeft%60).toString().padStart(2,'0');
        document.getElementById('timer-text').innerText = `${m}:${s}`;
        if(state.timeLeft <= 0) submitExam();
    }, 1000);
}

document.getElementById('btn-next').onclick = () => { if(state.curIdx < state.qs.length-1) { state.curIdx++; renderQ(); } };
document.getElementById('btn-prev').onclick = () => { if(state.curIdx > 0) { state.curIdx--; renderQ(); } };
document.getElementById('btn-finish').onclick = () => { if(confirm("Kirim jawaban sekarang?")) submitExam(); };

async function submitExam() {
    clearInterval(state.timer);
    showView('view-loading');
    
    let benar = 0;
    state.qs.forEach(q => { if(state.ans[q.Id||q.id] === q.kunci) benar++; });

    const payload = {
        nama_siswa: state.student.nama,
        token: state.student.token,
        mapel: state.config.mapel,
        kelas: state.student.tingkat,
        id_kelas: state.student.rombel,
        jml_benar: benar,
        jml_salah: state.qs.length - benar,
        nilai: Math.round((benar/state.qs.length)*100),
        nama_guru: state.config.nama_guru,
        jml_curang: state.jml_curang,
        wkt_mulai: state.startTime,
        wkt_selesai: new Date().toISOString()
    };

    try {
        await fetch(`${API_URL}/api/nilai`, { 
            method: "POST", headers: {"Content-Type":"application/json"}, 
            body: JSON.stringify(payload) 
        });
        document.getElementById('res-msg').innerText = `Jawaban ${state.student.nama} terkirim.`;
        localStorage.clear();
        showView('view-result');
    } catch(e) { alert("Gagal kirim, mencoba ulang..."); setTimeout(submitExam, 3000); }
}

// --- SILENT CHEAT DETECTION ---
document.addEventListener("visibilitychange", () => {
    if (document.hidden && state.student) {
        state.jml_curang++;
        saveState();
    }
});
