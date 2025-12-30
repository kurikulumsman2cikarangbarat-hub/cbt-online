const API_URL = "https://nocob-proxy.kurikulum-sman2cikarangbarat.workers.dev";
let exam = { 
    questions: [], 
    currentIndex: 0, 
    answers: {}, 
    student: {}, 
    config: {}, 
    timeLeft: 0, 
    start: null, 
    optionStates: {}, 
    cheatCount: 0 
};

function showToast(m) { 
    const t = document.getElementById('toast'); 
    t.innerText = m; 
    t.style.opacity = 1;
    setTimeout(() => t.style.opacity = 0, 2000);
}

function filterKelompok() {
    const tingkat = document.getElementById('input-kelas').value;
    const select = document.getElementById('input-kelompok');
    select.innerHTML = '<option value="" disabled selected>-- Pilih Kelas --</option>';
    
    ["A","B","C","D","E","F","G","H","I","J","K","L"].forEach(huruf => {
        let option = document.createElement("option");
        option.value = `${tingkat} - ${huruf}`;
        option.text = `${tingkat} - ${huruf}`;
        select.appendChild(option);
    });
}

function showConfirm() { 
    document.getElementById('modal-confirm').style.display = 'flex'; 
}

function hideConfirm() { 
    document.getElementById('modal-confirm').style.display = 'none'; 
}

async function login() {
    const nama = document.getElementById('input-nama').value;
    const kelas = document.getElementById('input-kelas').value;
    const kelompok = document.getElementById('input-kelompok').value;
    const token = document.getElementById('input-token').value.trim();
    
    if(!nama || !kelas || !kelompok || !token) {
        showToast("Lengkapi semua kolom!");
        return;
    }

    document.getElementById('view-login').style.display = 'none';
    document.getElementById('view-loading').classList.add('active');

    try {
        const [resUjian, resSoal] = await Promise.all([
            fetch(`${API_URL}/api/ujian?where=(token,eq,${token})`),
            fetch(`${API_URL}/api/bank_soal?where=(token,eq,${token})`)
        ]);
        
        const [dataUjian, dataSoal] = await Promise.all([
            resUjian.json(),
            resSoal.json()
        ]);

        if(!dataUjian.list.length) {
            throw new Error("Token Salah!");
        }
        
        exam.questions = dataSoal.list.sort(() => Math.random() - 0.5);
        exam.student = { 
            nama: nama, 
            tingkat: kelas, 
            rombel: kelompok, 
            token: token 
        };
        exam.config = { 
            mapel: dataUjian.list[0].mapel, 
            guru: dataUjian.list[0].nama_guru, 
            durasi: dataUjian.list[0].durasi 
        };
        exam.timeLeft = (parseInt(dataUjian.list[0].durasi) || 90) * 60;
        exam.start = new Date();

        document.getElementById('view-loading').classList.remove('active');
        document.getElementById('view-exam').classList.add('active');
        renderQuestion();
        startTimer();
    } catch(error) { 
        showToast(error.message); 
        location.reload(); 
    }
}

function renderQuestion() {
    const q = exam.questions[exam.currentIndex];
    const qId = q.Id || q.id;
    
    document.getElementById('q-number').innerText = `${exam.currentIndex + 1} / ${exam.questions.length}`;
    document.getElementById('q-text').innerHTML = q.soal;

    const img = document.getElementById('q-img');
    if(q.img_link) { 
        const id = q.img_link.match(/[-\w]{25,}/);
        img.src = id ? `https://lh3.googleusercontent.com/u/0/d/${id[0]}` : q.img_link;
        img.style.display = 'block';
    } else { 
        img.style.display = 'none'; 
    }

    if (!exam.optionStates[qId]) {
        let options = [
            {label:'A', text:q.opsi_a},
            {label:'B', text:q.opsi_b},
            {label:'C', text:q.opsi_c},
            {label:'D', text:q.opsi_d},
            {label:'E', text:q.opsi_e}
        ].filter(o => o.text);
        
        exam.optionStates[qId] = options.sort(() => Math.random() - 0.5);
    }

    let html = '';
    exam.optionStates[qId].forEach((option, index) => {
        const letter = String.fromCharCode(65 + index);
        const selected = exam.answers[qId] === option.label ? 'selected' : '';
        html += `<div class="option ${selected}" onclick="setAns('${qId}','${option.label}')">
                    <b>${letter}.</b> ${option.text}
                 </div>`;
    });
    
    document.getElementById('q-options').innerHTML = html;

    const semuaTerjawab = Object.keys(exam.answers).length === exam.questions.length;
    document.getElementById('btn-kirim-trigger').style.display = semuaTerjawab ? 'block' : 'none';
    
    renderNav();
}

function setAns(id, label) { 
    exam.answers[id] = label; 
    renderQuestion(); 
    setTimeout(() => { 
        if(exam.currentIndex < exam.questions.length - 1) {
            jump(exam.currentIndex + 1); 
        }
    }, 400);
}

function startTimer() {
    exam.timer = setInterval(() => {
        exam.timeLeft--;
        let minutes = Math.floor(exam.timeLeft/60).toString().padStart(2,'0');
        let seconds = (exam.timeLeft%60).toString().padStart(2,'0');
        document.getElementById('timer-display').innerText = `${minutes}:${seconds}`;
        
        if(exam.timeLeft <= 0) {
            submitData();
        }
    }, 1000);
}

function jump(index) { 
    exam.currentIndex = index; 
    renderQuestion(); 
}

function nextQ() { 
    if(exam.currentIndex < exam.questions.length - 1) {
        jump(exam.currentIndex + 1); 
    }
}

function prevQ() { 
    if(exam.currentIndex > 0) {
        jump(exam.currentIndex - 1); 
    }
}

function renderNav() {
    document.getElementById('nav-grid').innerHTML = exam.questions.map((q, index) => {
        const qId = q.Id || q.id;
        const answered = exam.answers[qId] ? 'answered' : '';
        const current = index === exam.currentIndex ? 'current' : '';
        
        return `<div class="nav-box ${answered} ${current}" onclick="jump(${index})">${index + 1}</div>`;
    }).join('');
}

async function submitData() {
    hideConfirm();
    clearInterval(exam.timer);
    
    document.getElementById('view-exam').style.display = 'none';
    document.getElementById('view-loading').classList.add('active');
    document.getElementById('loading-text').innerText = "Menyimpan ke Server...";

    let sortedQuestions = [...exam.questions].sort((a, b) => (a.Id||a.id) - (b.Id||b.id));
    let stringJawaban = "";
    let benar = 0;
    
    sortedQuestions.forEach(q => {
        const jawaban = exam.answers[q.Id||q.id] || "-";
        stringJawaban += jawaban;
        if(jawaban === q.kunci) benar++;
    });

    const now = new Date();
    const payload = {
        nama_siswa: exam.student.nama,
        token: exam.student.token,
        mapel: exam.config.mapel,
        kelas: exam.student.tingkat,
        id_kelas: exam.student.rombel,
        jml_benar: benar,
        jml_salah: exam.questions.length - benar,
        nilai: Math.round((benar/exam.questions.length)*100),
        nama_guru: exam.config.guru,
        jawaban: stringJawaban,
        curang: exam.cheatCount,
        wkt_diberikan: exam.config.durasi + " Menit",
        wkt_mulai: exam.start.toISOString().slice(0,19).replace('T',' '),
        wkt_selesai: now.toISOString().slice(0,19).replace('T',' '),
        wkt_digunakan: Math.floor((now - exam.start)/60000) + " Menit"
    };

    try {
        await fetch(`${API_URL}/api/nilai`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        
        document.getElementById('view-loading').classList.remove('active');
        document.getElementById('view-result').classList.add('active');
        document.getElementById('final-msg').innerHTML = 
            `Jawaban <b>${exam.student.nama}</b> berhasil terkirim.<br>Silakan tunjukkan layar ini kepada pengawas.`;
    } catch(error) { 
        showToast("Gagal kirim, mencoba ulang..."); 
        setTimeout(submitData, 3000); 
    }
}

document.addEventListener("visibilitychange", () => {
    if (document.hidden && document.getElementById('view-exam').classList.contains('active')) {
        exam.cheatCount++;
        showToast("⚠️ Peringatan: Jangan pindah tab!");
    }
});
